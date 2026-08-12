import "server-only";

import {
  occupySlotInTransaction,
  readSlotInTransaction,
  releaseSlotInTransaction,
} from "@/src/features/agenda/repositories/availabilityRepository";
import { deriveSlotStatus, isSlotBookable } from "@/src/features/agenda/types";
import {
  toAppointmentDTO,
  type Appointment,
  type AppointmentDTO,
  type AppointmentStatus,
} from "@/src/features/agendamentos/types";
import { appointmentValidators } from "@/src/features/agendamentos/validators/appointmentValidators";
import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";
import { dominioTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { AppError } from "@/src/shared/errors";

/**
 * Persistência de agendamentos e as operações que precisam ser atômicas.
 *
 * Por que as transações vivem no repository, e não no service: as regras
 * "existe?", "já cancelado?", "slot ainda livre?" só valem se forem verificadas
 * DENTRO da mesma transação que escreve — checar antes, no service, seria uma
 * janela de corrida (PRD RN-09). O service continua dono da validação de
 * entrada, do log de domínio e da tradução do erro; o repository é dono do
 * Firestore e da atomicidade.
 *
 * Agendamento e slot são escritos na mesma transação sempre: um agendamento sem
 * o slot ocupado permite overbooking, e um slot ocupado sem agendamento ativo
 * queima o horário para sempre.
 */

const STATUS_AGUARDANDO: AppointmentStatus = "aguardando_agendamento";
const STATUS_CONFIRMADO: AppointmentStatus = "confirmado";
const STATUS_CANCELADO: AppointmentStatus = "cancelado";

/**
 * Status que mantêm o agendamento na listagem ativa — todos menos `cancelado`.
 *
 * Enumerar em vez de usar `status != cancelado` não é preferência de estilo: com
 * desigualdade, o Firestore obriga o primeiro `orderBy` a ser o campo comparado
 * (`status`) e o `limit` recortaria por status/id, cegamente à cronologia. Com
 * igualdade (`in`), a query ordena por `data`/`horario` e o corte é cronológico.
 */
const STATUS_ATIVOS: readonly AppointmentStatus[] = [
  STATUS_AGUARDANDO,
  STATUS_CONFIRMADO,
] as const;

/**
 * Teto da listagem ativa. A v1 não tem paginação (tech_spec §11.2) e uma query
 * sem limite cresce sem controle; o excesso é registrado para virar paginação
 * antes de virar incidente.
 *
 * Exportado porque é contrato observável da listagem (quantos itens ela devolve
 * no máximo) — quem verifica o comportamento de truncamento precisa do mesmo
 * número, não de uma cópia que envelhece.
 */
export const MAX_AGENDAMENTOS_ATIVOS = 200;

/** Dados de uma nova solicitação — já validados e normalizados pelo service. */
export type NewAppointmentInput = {
  cliente: string;
  telefone: string;
  profissional: string;
  data: string;
  horario: string;
};

export const appointmentRepository = {
  /**
   * Agendamentos que ainda exigem acompanhamento (PRD RN-01/RN-02).
   *
   * O filtro por status vive na query — é o que garante que cancelado não volta
   * para a listagem principal nem por engano da UI. A ordenação cronológica
   * também é da query (`data`, `horario`), e não de memória: o teto abaixo corta
   * a lista, e cortar antes de ordenar deixaria de fora agendamentos de hoje em
   * favor de agendamentos distantes, dependendo apenas do id gerado.
   *
   * `in` + `orderBy` exige o índice composto (`status`, `data`, `horario`)
   * declarado em `firestore.indexes.json` e publicado com
   * `firebase deploy --only firestore:indexes`. O emulador NÃO exige índice, então
   * a suíte de integração passa sem ele — publicar é passo de deploy.
   *
   * Documento corrompido é descartado com log, não propagado: aqui um único
   * documento inválido derrubaria a listagem inteira do administrador (mesma
   * política de `readSlots`, em `availabilityRepository`). A falha estrita fica
   * nos caminhos de um documento específico e acionável (`confirmAdmin`,
   * `cancelReleasingSlot`).
   */
  async listActive(now: Date): Promise<AppointmentDTO[]> {
    const snapshot = await getFirestoreAdmin()
      .collection(firestorePaths.agendamentos())
      .where("status", "in", STATUS_ATIVOS)
      .orderBy("data")
      .orderBy("horario")
      .limit(MAX_AGENDAMENTOS_ATIVOS + 1)
      .get();

    const pagina = snapshot.docs.slice(0, MAX_AGENDAMENTOS_ATIVOS);

    if (snapshot.size > MAX_AGENDAMENTOS_ATIVOS) {
      console.warn("[agendamentos] listagem truncada", {
        limite: MAX_AGENDAMENTOS_ATIVOS,
        // A query pede `limite + 1` justamente para detectar o excedente sem
        // varrer a collection — o total real fora da página pode ser maior, e
        // contá-lo exigiria a query sem teto que este teto existe para evitar.
        foraDaListagemAoMenos: snapshot.size - MAX_AGENDAMENTOS_ATIVOS,
      });
    }

    const ativos: AppointmentDTO[] = [];
    let descartados = 0;

    for (const doc of pagina) {
      const appointment = toAppointmentOrNull(doc.id, doc.data());

      if (appointment === null) {
        descartados += 1;
        continue;
      }

      ativos.push(toAppointmentDTO(appointment, now));
    }

    if (descartados > 0) {
      console.warn("[agendamentos] agendamentos ignorados", {
        motivo: "documento_invalido",
        descartados,
      });
    }

    return ativos;
  },

  /**
   * Cria a solicitação e ocupa o horário em uma única transação (PRD CA-08/CA-09).
   *
   * A leitura do documento do dia é o ponto de serialização: duas solicitações
   * simultâneas para o mesmo horário disputam esse lock, uma comita e a outra
   * reexecuta a transação, encontra o slot ocupado e recebe `conflict`.
   */
  async createOccupyingSlot(
    input: NewAppointmentInput,
    now: Date,
  ): Promise<AppointmentDTO> {
    const db = getFirestoreAdmin();
    const collection = db.collection(firestorePaths.agendamentos());

    return db.runTransaction(async (tx) => {
      const slot = await readSlotInTransaction(tx, input.data, input.horario);

      if (slot === null || !isSlotBookable(slot, now)) {
        console.warn("[agendamentos] reserva recusada", {
          motivo: slot === null ? "slot_inexistente" : deriveSlotStatus(slot, now),
        });
        throw new AppError("conflict", dominioTexts.horarioIndisponivel);
      }

      const ref = collection.doc();
      const appointment: Appointment = {
        id: ref.id,
        cliente: input.cliente,
        telefone: input.telefone,
        profissional: input.profissional,
        data: input.data,
        horario: input.horario,
        status: STATUS_AGUARDANDO,
        adminConfirmadoEm: null,
        profissionalConfirmadoEm: null,
        canceladoEm: null,
      };

      // `create` (não `set`): se o id sorteado já existir, a transação falha em
      // vez de sobrescrever um agendamento alheio.
      tx.create(ref, toDocument(appointment));
      occupySlotInTransaction(tx, input.data, input.horario, ref.id);

      return toAppointmentDTO(appointment, now);
    });
  },

  /**
   * Cancela o agendamento e libera o horário na mesma transação (PRD CA-05).
   *
   * O slot só é liberado se estiver vinculado a ESTE agendamento: liberar um
   * horário que já pertence a outra solicitação criaria a duplicidade que o
   * cancelamento deveria evitar.
   */
  async cancelReleasingSlot(
    agendamentoId: string,
    now: Date,
  ): Promise<AppointmentDTO> {
    const db = getFirestoreAdmin();
    const ref = db.doc(firestorePaths.agendamento(agendamentoId));

    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);

      if (!snapshot.exists) {
        console.warn("[agendamentos] cancelamento recusado", { motivo: "not_found" });
        throw new AppError("not_found", dominioTexts.agendamentoNaoEncontrado);
      }

      const appointment = toAppointment(snapshot.id, snapshot.data());

      if (appointment.canceladoEm !== null || appointment.status === STATUS_CANCELADO) {
        console.warn("[agendamentos] cancelamento recusado", { motivo: "ja_cancelado" });
        throw new AppError("conflict", dominioTexts.agendamentoJaCancelado);
      }

      // Toda leitura precede toda escrita da transação.
      const slot = await readSlotInTransaction(
        tx,
        appointment.data,
        appointment.horario,
      );

      const canceladoEm = now.toISOString();
      tx.update(ref, { status: STATUS_CANCELADO, canceladoEm });

      if (slot !== null && slot.agendamentoId === appointment.id) {
        releaseSlotInTransaction(tx, appointment.data, appointment.horario);
      } else {
        console.warn("[agendamentos] slot não liberado", { motivo: "vinculo_ausente" });
      }

      return toAppointmentDTO(
        { ...appointment, status: STATUS_CANCELADO, canceladoEm },
        now,
      );
    });
  },

  /**
   * Registra a confirmação administrativa (PRD CA-03/CA-04).
   *
   * Transação de um documento só, para que ler "já confirmado?" e gravar o
   * timestamp não possam ser intercalados por um segundo clique — o timestamp
   * original nunca é sobrescrito.
   */
  async confirmAdmin(agendamentoId: string, now: Date): Promise<AppointmentDTO> {
    const db = getFirestoreAdmin();
    const ref = db.doc(firestorePaths.agendamento(agendamentoId));

    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);

      if (!snapshot.exists) {
        console.warn("[agendamentos] confirmação recusada", { motivo: "not_found" });
        throw new AppError("not_found", dominioTexts.agendamentoNaoEncontrado);
      }

      const appointment = toAppointment(snapshot.id, snapshot.data());

      if (appointment.canceladoEm !== null || appointment.status === STATUS_CANCELADO) {
        console.warn("[agendamentos] confirmação recusada", { motivo: "cancelado" });
        throw new AppError("conflict", dominioTexts.agendamentoCancelado);
      }

      if (appointment.adminConfirmadoEm !== null) {
        console.warn("[agendamentos] confirmação recusada", { motivo: "duplicada" });
        throw new AppError("conflict", feedbackTexts.confirmacaoDuplicada);
      }

      const adminConfirmadoEm = now.toISOString();
      tx.update(ref, { adminConfirmadoEm });

      return toAppointmentDTO({ ...appointment, adminConfirmadoEm }, now);
    });
  },
} as const;

function toDocument(appointment: Appointment): Record<string, unknown> {
  return {
    cliente: appointment.cliente,
    telefone: appointment.telefone,
    profissional: appointment.profissional,
    data: appointment.data,
    horario: appointment.horario,
    status: appointment.status,
    adminConfirmadoEm: appointment.adminConfirmadoEm,
    profissionalConfirmadoEm: appointment.profissionalConfirmadoEm,
    canceladoEm: appointment.canceladoEm,
  };
}

/**
 * Converte o documento no modelo de domínio, validando campo por campo.
 *
 * Estrito de propósito: todo documento é escrito por este repository, então
 * campo faltando ou fora do formato é corrupção — e um agendamento com data
 * inválida derivaria status errado e apareceria no painel como se estivesse são.
 * O log identifica o documento sem expor nome/telefone do cliente.
 *
 * Use nos caminhos que operam UM documento específico, em que a falha é
 * acionável pelo administrador (confirmar/cancelar aquele agendamento). Para
 * varrer uma coleção, use `toAppointmentOrNull`.
 */
function toAppointment(id: string, data: unknown): Appointment {
  try {
    if (typeof data !== "object" || data === null) {
      throw new AppError("unexpected", "Documento vazio.");
    }

    const campos = data as Record<string, unknown>;

    return {
      id,
      cliente: appointmentValidators.assertCustomerName(campos.cliente),
      telefone: appointmentValidators.assertPhone(campos.telefone),
      profissional: appointmentValidators.assertProfessional(campos.profissional),
      data: appointmentValidators.assertIsoDate(campos.data),
      horario: appointmentValidators.assertTimeOfDay(campos.horario),
      status: appointmentValidators.assertStatus(campos.status),
      adminConfirmadoEm: readTimestamp(campos.adminConfirmadoEm, "adminConfirmadoEm"),
      profissionalConfirmadoEm: readTimestamp(
        campos.profissionalConfirmadoEm,
        "profissionalConfirmadoEm",
      ),
      canceladoEm: readTimestamp(campos.canceladoEm, "canceladoEm"),
    };
  } catch (error) {
    console.error("[agendamentos] documento inválido", { agendamentoId: id });
    throw new AppError("unavailable", dominioTexts.servicoIndisponivel, {
      cause: error,
    });
  }
}

/**
 * Mesma conversão, tolerante: documento inválido devolve `null` em vez de lançar.
 *
 * É o que separa "esta operação falhou" de "um item da lista está corrompido".
 * Numa listagem, propagar a falha de um documento apaga a listagem de todos os
 * outros — o administrador perde a operação inteira por causa de um registro
 * editado à mão no console do Firebase. `toAppointment` já registrou qual
 * documento é (id, sem PII); aqui só se decide descartar.
 */
function toAppointmentOrNull(id: string, data: unknown): Appointment | null {
  try {
    return toAppointment(id, data);
  } catch {
    return null;
  }
}

/** Timestamps são ISO-8601 UTC; ausente é `null`, presente e inválido é erro. */
function readTimestamp(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new AppError("unexpected", `Campo ${field} inválido.`);
  }

  return value;
}
