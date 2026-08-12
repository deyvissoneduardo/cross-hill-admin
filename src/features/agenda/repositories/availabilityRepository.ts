import "server-only";

import { FieldPath, type Transaction } from "firebase-admin/firestore";

import {
  isSlotOccupied,
  toAvailabilitySlotDTO,
  type AvailabilitySlot,
  type AvailabilitySlotDTO,
  type AvailabilitySlotInput,
} from "@/src/features/agenda/types";
import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";
import { dominioTexts } from "@/src/shared/constants/texts";
import { AppError, fieldError } from "@/src/shared/errors";
import { isCanonicalTimeOfDay } from "@/src/shared/time";
// Validação compartilhada, em `shared` e não na feature `agendamentos`: se a
// agenda aceitasse um horário que a reserva rejeita, existiria slot salvo que
// nenhum cliente consegue solicitar — a regra tem de ser a mesma nas duas
// features, sem que nenhuma delas dependa da outra.
import { assertTimeOfDay } from "@/src/shared/validators";

/**
 * Persistência de disponibilidade — um documento por data
 * (`disponibilidade/{YYYY-MM-DD}`), com os horários em um mapa `slots`.
 *
 * Por que mapa em um único documento, e não uma collection de slots: a reserva
 * precisa ser atômica contra concorrência (PRD RN-09). Com todos os horários da
 * data no MESMO documento, a transação de reserva lê um único documento e o lock
 * pessimista dessa leitura serializa duas solicitações simultâneas —
 * independente do horário disputado, sem índice nem query extra.
 *
 * Além da API pública do repository — que devolve sempre DTOs serializáveis —,
 * este módulo exporta as primitivas transacionais consumidas por
 * `appointmentRepository`: criar/cancelar agendamento e ocupar/liberar o slot são
 * a MESMA transação, então o documento de disponibilidade precisa ser manipulado
 * de dentro dela. Essas primitivas devolvem o modelo (com `agendamentoId`), não o
 * DTO: o cancelamento precisa conferir a QUAL agendamento o slot pertence.
 *
 * A dependência entre as duas features é de mão única por construção:
 * `agendamentos` importa daqui (precisa manipular o slot na mesma transação) e
 * este módulo não importa nada de `agendamentos` — o vocabulário comum (validação
 * de data e horário) vem de `shared`.
 */

/**
 * Teto de horários por data — limite defensivo de tamanho do documento.
 *
 * A grade é livre (o administrador escolhe cada horário; nada aqui impõe passo
 * fixo). 96 é o número de horários de uma grade de 15 minutos cobrindo 24h, ou
 * seja, folga larga para qualquer agenda real — o teto existe para um payload
 * malformado não fazer o documento do dia crescer sem controle, já que todos os
 * horários da data vivem em um único documento.
 */
const MAX_SLOTS_POR_DIA = 96;

type PersistedSlot = {
  liberado: boolean;
  agendamentoId: string | null;
};

export const availabilityRepository = {
  /** Todos os slots persistidos da data, ordenados por horário. */
  async listDaySlots(isoDate: string, now: Date): Promise<AvailabilitySlotDTO[]> {
    const snapshot = await getFirestoreAdmin()
      .doc(firestorePaths.disponibilidadeDoDia(isoDate))
      .get();

    return readSlots(isoDate, snapshot.data()).map((slot) =>
      toAvailabilitySlotDTO(slot, now),
    );
  },

  /**
   * Substitui a agenda da data pelos horários informados.
   *
   * Transacional porque a ocupação vigente precisa sobreviver ao salvamento: o
   * administrador edita `liberado`, nunca `agendamentoId`. Um horário ocupado
   * que o payload tenta bloquear ou remover é recusado — apagar esse vínculo
   * devolveria o horário para a vitrine pública com agendamento ativo em pé.
   */
  async saveDaySlots(
    isoDate: string,
    inputs: readonly AvailabilitySlotInput[],
    now: Date,
  ): Promise<AvailabilitySlotDTO[]> {
    if (inputs.length > MAX_SLOTS_POR_DIA) {
      throw fieldError("horarios", dominioTexts.horariosDemais);
    }

    const desejados = new Map<string, boolean>();
    for (const input of inputs) {
      const horario = assertTimeOfDay(input.horario);

      if (desejados.has(horario)) {
        throw fieldError("horarios", dominioTexts.horarioRepetido);
      }

      desejados.set(horario, input.liberado === true);
    }

    const db = getFirestoreAdmin();
    const ref = db.doc(firestorePaths.disponibilidadeDoDia(isoDate));

    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const atuais = readSlots(isoDate, snapshot.data());

      const slots: Record<string, PersistedSlot> = {};
      for (const [horario, liberado] of desejados) {
        slots[horario] = { liberado, agendamentoId: null };
      }

      for (const atual of atuais) {
        if (!isSlotOccupied(atual)) {
          continue;
        }

        const desejado = slots[atual.horario];
        if (desejado === undefined || !desejado.liberado) {
          console.warn("[agenda] salvamento recusado", {
            motivo: "slot_ocupado",
          });
          throw new AppError(
            "conflict",
            dominioTexts.horarioOcupadoNaoBloqueavel,
          );
        }

        desejado.agendamentoId = atual.agendamentoId;
      }

      tx.set(ref, {
        data: isoDate,
        slots,
        atualizadoEm: now.toISOString(),
      });

      return readSlots(isoDate, { slots }).map((slot) =>
        toAvailabilitySlotDTO(slot, now),
      );
    });
  },
} as const;

/**
 * Lê um slot dentro de uma transação. `null` quando a data não tem agenda ou o
 * horário não está nela — para quem chama, ambos significam "não solicitável".
 *
 * A leitura é o ponto de serialização da reserva: ela mantém lock pessimista
 * sobre o documento do dia até o commit.
 */
export async function readSlotInTransaction(
  tx: Transaction,
  isoDate: string,
  horario: string,
): Promise<AvailabilitySlot | null> {
  const snapshot = await tx.get(
    getFirestoreAdmin().doc(firestorePaths.disponibilidadeDoDia(isoDate)),
  );

  const slots = readSlots(isoDate, snapshot.data());
  return slots.find((slot) => slot.horario === horario) ?? null;
}

/** Vincula o slot ao agendamento. Exige o slot já lido na mesma transação. */
export function occupySlotInTransaction(
  tx: Transaction,
  isoDate: string,
  horario: string,
  agendamentoId: string,
): void {
  tx.update(
    getFirestoreAdmin().doc(firestorePaths.disponibilidadeDoDia(isoDate)),
    new FieldPath("slots", horario, "agendamentoId"),
    agendamentoId,
  );
}

/** Devolve o slot para a vitrine pública, mantendo `liberado` como estava. */
export function releaseSlotInTransaction(
  tx: Transaction,
  isoDate: string,
  horario: string,
): void {
  tx.update(
    getFirestoreAdmin().doc(firestorePaths.disponibilidadeDoDia(isoDate)),
    new FieldPath("slots", horario, "agendamentoId"),
    null,
  );
}

/**
 * Converte o mapa `slots` do documento em modelos ordenados por horário.
 *
 * Entrada desconhecida é tratada com desconfiança: horário fora do formato
 * canônico ou valor que não é objeto é descartado com log, porque um documento
 * editado à mão no console do Firebase não pode derrubar a agenda inteira.
 */
function readSlots(isoDate: string, data: unknown): AvailabilitySlot[] {
  const slots = isRecord(data) ? data.slots : undefined;
  if (!isRecord(slots)) {
    return [];
  }

  const resultado: AvailabilitySlot[] = [];
  let descartados = 0;

  for (const [horario, bruto] of Object.entries(slots)) {
    if (!isRecord(bruto) || !isCanonicalTimeOfDay(horario)) {
      descartados += 1;
      continue;
    }

    resultado.push({
      data: isoDate,
      horario,
      liberado: bruto.liberado === true,
      agendamentoId:
        typeof bruto.agendamentoId === "string" && bruto.agendamentoId.length > 0
          ? bruto.agendamentoId
          : null,
    });
  }

  if (descartados > 0) {
    console.warn("[agenda] slots ignorados", { motivo: "formato_invalido", descartados });
  }

  return resultado.sort((a, b) => a.horario.localeCompare(b.horario));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
