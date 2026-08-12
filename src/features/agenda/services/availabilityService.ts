import "server-only";

import { availabilityRepository } from "@/src/features/agenda/repositories/availabilityRepository";
import {
  isSlotDTOBookable,
  type AvailabilitySlotDTO,
  type AvailabilitySlotInput,
} from "@/src/features/agenda/types";
import { withDomainErrors } from "@/src/shared/errors";
import { assertIsoDate } from "@/src/shared/validators";

/**
 * Regras de disponibilidade: o que o cliente pode solicitar e o que o
 * administrador salva.
 *
 * As duas consultas existem porque as audiências são diferentes e essa diferença
 * é a regra de negócio: o administrador precisa ver o dia inteiro (liberado,
 * bloqueado, ocupado, inativo) para operar a agenda; o cliente só pode receber
 * horários realmente solicitáveis (PRD CA-07) — mandar um slot ocupado para a
 * vitrine pública é convidar a solicitação que vai falhar.
 *
 * Sem React e sem Firestore direto: a persistência fica em
 * `availabilityRepository`, e a UI recebe apenas DTOs serializáveis.
 *
 * **`now` é injetável em toda função pública** (default `new Date()`): o estado
 * visual de um slot depende de o instante do atendimento já ter chegado, então o
 * relógio faz parte da entrada da regra. Fixá-lo é o que permite testar
 * `disponivel` vs. `inativo` sem mexer no relógio do processo, e é a mesma cadeia
 * determinística que `shared/time` e o repository já exigem (`now` obrigatório).
 */

/** Prefixo de log da feature — `withDomainErrors` aplica a política de erro. */
const ESCOPO = "agenda";

/** Todos os horários da data, para a agenda administrativa (PRD US-05). */
export async function listDaySlots(
  isoDate: string,
  now: Date = new Date(),
): Promise<AvailabilitySlotDTO[]> {
  const data = assertIsoDate(isoDate);

  return withDomainErrors(ESCOPO, "agenda", () =>
    availabilityRepository.listDaySlots(data, now),
  );
}

/** Somente horários liberados, livres e ainda futuros (PRD CA-07/CA-08). */
export async function listBookableSlots(
  isoDate: string,
  now: Date = new Date(),
): Promise<AvailabilitySlotDTO[]> {
  const data = assertIsoDate(isoDate);

  return withDomainErrors(ESCOPO, "disponibilidade", async () => {
    const slots = await availabilityRepository.listDaySlots(data, now);
    return slots.filter(isSlotDTOBookable);
  });
}

/**
 * Salva a agenda da data com os horários liberados/bloqueados informados.
 *
 * O administrador controla apenas `liberado`. Horário ocupado por agendamento
 * ativo não pode ser bloqueado nem removido — a tentativa falha com `conflict`,
 * em vez de silenciosamente descartar o vínculo e liberar um horário já vendido.
 */
export async function saveDayAvailability(
  isoDate: string,
  slots: readonly AvailabilitySlotInput[],
  now: Date = new Date(),
): Promise<AvailabilitySlotDTO[]> {
  const data = assertIsoDate(isoDate);

  return withDomainErrors(ESCOPO, "salvar-agenda", () =>
    availabilityRepository.saveDaySlots(data, slots, now),
  );
}

export const availabilityService = {
  listDaySlots,
  listBookableSlots,
  saveDayAvailability,
} as const;
