import { hasAppointmentInstantArrived } from "@/src/shared/time";

/**
 * Domínio de disponibilidade: slot persistido, DTO serializável e as derivações
 * puras de estado visual/solicitabilidade.
 *
 * Um slot tem duas dimensões independentes, e confundi-las é a origem do
 * overbooking: `liberado` é decisão do administrador (o horário pode receber
 * solicitação) e `agendamentoId` é ocupação real (já tem agendamento ativo). Só
 * `liberado && !ocupado` é solicitável pelo cliente (PRD RN-06/RN-07/RN-08).
 */

/** Aparência do slot na agenda administrativa (`design.md` §4.3). */
export type AvailabilitySlotStatus =
  | "disponivel"
  | "ocupado"
  | "bloqueado"
  | "inativo";

const SLOT_DISPONIVEL: AvailabilitySlotStatus = "disponivel";

/** Estado persistido de um horário dentro do documento do dia. */
export type AvailabilitySlot = {
  /** `YYYY-MM-DD`. */
  data: string;
  /** `HH:mm`. */
  horario: string;
  liberado: boolean;
  /** Id do agendamento ativo que ocupa o horário, ou `null` se livre. */
  agendamentoId: string | null;
};

/** Projeção serializável consumida pela UI (tech_spec §7.2). */
export type AvailabilitySlotDTO = {
  /** `2026-08-15T09:00` — estável, para key de lista e seleção. */
  id: string;
  data: string;
  horario: string;
  liberado: boolean;
  ocupado: boolean;
  statusVisual: AvailabilitySlotStatus;
};

/** Horário que o administrador libera ou bloqueia ao salvar a agenda do dia. */
export type AvailabilitySlotInput = {
  horario: string;
  liberado: boolean;
};

/** Identificador estável do slot (a chave natural é data + horário). */
export function availabilitySlotId(data: string, horario: string): string {
  return `${data}T${horario}`;
}

/** `true` quando o slot está ocupado por um agendamento ativo. */
export function isSlotOccupied(slot: AvailabilitySlot): boolean {
  return slot.agendamentoId !== null;
}

/**
 * `true` quando o cliente pode solicitar este horário (PRD CA-07).
 *
 * Definido em cima de `deriveSlotStatus` para existir UMA regra de
 * solicitabilidade: `disponivel` é exatamente liberado, livre e ainda futuro
 * (horário cujo instante passou não é solicitável mesmo liberado e livre — a
 * agenda do dia continua existindo depois de o dia começar). Assim a vitrine
 * pública e a transação de reserva nunca discordam.
 */
export function isSlotBookable(slot: AvailabilitySlot, now: Date): boolean {
  return deriveSlotStatus(slot, now) === SLOT_DISPONIVEL;
}

/** Mesma regra de `isSlotBookable`, sobre o DTO já derivado. */
export function isSlotDTOBookable(slot: AvailabilitySlotDTO): boolean {
  return slot.statusVisual === SLOT_DISPONIVEL;
}

/** Aparência do slot. Ocupação vence bloqueio: ela exige ação, não só cor. */
export function deriveSlotStatus(
  slot: AvailabilitySlot,
  now: Date,
): AvailabilitySlotStatus {
  if (isSlotOccupied(slot)) {
    return "ocupado";
  }

  if (!slot.liberado) {
    return "bloqueado";
  }

  if (hasAppointmentInstantArrived(slot.data, slot.horario, now)) {
    return "inativo";
  }

  return SLOT_DISPONIVEL;
}

/** Converte o slot persistido no DTO da UI, resolvendo os derivados. */
export function toAvailabilitySlotDTO(
  slot: AvailabilitySlot,
  now: Date,
): AvailabilitySlotDTO {
  return {
    id: availabilitySlotId(slot.data, slot.horario),
    data: slot.data,
    horario: slot.horario,
    liberado: slot.liberado,
    ocupado: isSlotOccupied(slot),
    statusVisual: deriveSlotStatus(slot, now),
  };
}
