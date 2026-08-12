import { hasAppointmentInstantArrived } from "@/src/shared/time";

/**
 * Domínio de agendamento: modelo persistido, DTO serializável e as derivações
 * puras de status/primeiro confirmador.
 *
 * Duas decisões governam este módulo:
 *
 * 1. **Timestamps são `string` ISO-8601 UTC**, não `Timestamp` do Firestore. O
 *    DTO atravessa a fronteira servidor → Client Component, e só valor
 *    serializável passa por ali. Como todos são gravados em UTC (`Z`), a ordem
 *    lexicográfica coincide com a cronológica.
 * 2. **`status` do DTO é derivado, não lido do documento.** O PRD é explícito:
 *    quando profissional e administrador confirmam, o status canônico continua
 *    `aguardando agendamento` (RN-15) e só termina quando a data/horário do
 *    atendimento chega (RN-16). Derivar evita o documento "confirmado" cedo
 *    demais por causa de uma confirmação.
 */

/** Status canônico do agendamento (PRD RN-01/RN-15/RN-16). */
export type AppointmentStatus =
  | "aguardando_agendamento"
  | "confirmado"
  | "cancelado";

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "aguardando_agendamento",
  "confirmado",
  "cancelado",
] as const;

/** As duas partes que podem confirmar um agendamento (PRD RN-14). */
export type ConfirmerParty = "admin" | "profissional";

/**
 * Estado persistido de um agendamento.
 *
 * `status` aqui é o campo do documento — usado pela query da listagem ativa
 * para excluir cancelados. Para exibir status, use o DTO (derivado).
 */
export type Appointment = {
  id: string;
  cliente: string;
  telefone: string;
  profissional: string;
  /** `YYYY-MM-DD`. */
  data: string;
  /** `HH:mm`. */
  horario: string;
  status: AppointmentStatus;
  adminConfirmadoEm: string | null;
  profissionalConfirmadoEm: string | null;
  canceladoEm: string | null;
};

/** Projeção serializável consumida pela UI (tech_spec §7.2). */
export type AppointmentDTO = {
  id: string;
  cliente: string;
  telefone: string;
  profissional: string;
  data: string;
  horario: string;
  /** Derivado por `deriveAppointmentStatus` — não é o campo cru do documento. */
  status: AppointmentStatus;
  adminConfirmadoEm: string | null;
  profissionalConfirmadoEm: string | null;
  confirmadoPrimeiroPor: ConfirmerParty | null;
  canceladoEm: string | null;
};

/**
 * Quem confirmou primeiro, pelo timestamp (PRD RN-17).
 *
 * Uma confirmação só existe se o timestamp for uma data válida — timestamp
 * corrompido conta como ausente, para o painel nunca apontar um "primeiro"
 * derivado de lixo. Empate exato devolve `null`: ninguém foi primeiro.
 */
export function deriveFirstConfirmer(
  adminConfirmadoEm: string | null,
  profissionalConfirmadoEm: string | null,
): ConfirmerParty | null {
  const admin = parseTimestamp(adminConfirmadoEm);
  const profissional = parseTimestamp(profissionalConfirmadoEm);

  if (admin === null) {
    return profissional === null ? null : "profissional";
  }

  if (profissional === null) {
    return "admin";
  }

  if (admin === profissional) {
    return null;
  }

  return admin < profissional ? "admin" : "profissional";
}

/**
 * Status exibível do agendamento.
 *
 * Ordem das regras (PRD RN-15/RN-16): cancelamento vence tudo; as duas
 * confirmações só encerram `aguardando agendamento` DEPOIS de o horário do
 * atendimento chegar — antes disso o status é preservado, mesmo com ambas as
 * partes confirmadas.
 */
export function deriveAppointmentStatus(
  appointment: Appointment,
  now: Date,
): AppointmentStatus {
  if (appointment.canceladoEm !== null || appointment.status === "cancelado") {
    return "cancelado";
  }

  const confirmadoPelasDuasPartes =
    parseTimestamp(appointment.adminConfirmadoEm) !== null &&
    parseTimestamp(appointment.profissionalConfirmadoEm) !== null;

  if (
    confirmadoPelasDuasPartes &&
    hasAppointmentInstantArrived(appointment.data, appointment.horario, now)
  ) {
    return "confirmado";
  }

  return "aguardando_agendamento";
}

/** Converte o modelo persistido no DTO da UI, resolvendo os derivados. */
export function toAppointmentDTO(
  appointment: Appointment,
  now: Date,
): AppointmentDTO {
  return {
    id: appointment.id,
    cliente: appointment.cliente,
    telefone: appointment.telefone,
    profissional: appointment.profissional,
    data: appointment.data,
    horario: appointment.horario,
    status: deriveAppointmentStatus(appointment, now),
    adminConfirmadoEm: appointment.adminConfirmadoEm,
    profissionalConfirmadoEm: appointment.profissionalConfirmadoEm,
    confirmadoPrimeiroPor: deriveFirstConfirmer(
      appointment.adminConfirmadoEm,
      appointment.profissionalConfirmadoEm,
    ),
    canceladoEm: appointment.canceladoEm,
  };
}

function parseTimestamp(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const instant = Date.parse(value);
  return Number.isNaN(instant) ? null : instant;
}
