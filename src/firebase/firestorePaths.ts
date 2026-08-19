import { AppError } from "@/src/shared/errors";

/**
 * Caminhos Firestore centralizados.
 *
 * Repositories nunca escrevem string de collection/document à mão: um typo
 * cria silenciosamente uma collection paralela. Os identificadores recebidos
 * são validados porque `/` em um id atravessaria níveis do caminho.
 */

const COLLECTIONS = {
  agendamentos: "agendamentos",
  disponibilidade: "disponibilidade",
  configuracoes: "configuracoes",
  posAgendamento: "pos_agendamento",
} as const;

const CONFIG_DOCS = {
  aparencia: "aparencia",
  posAgendamento: "pos-agendamento",
  profissional: "profissional",
  googleCalendar: "google-calendar",
} as const;

const POS_AGENDAMENTO_DOCS = {
  textos: "textos",
} as const;

export const firestorePaths = {
  /** Collection de agendamentos. */
  agendamentos: () => COLLECTIONS.agendamentos,
  /** Documento de um agendamento. */
  agendamento: (agendamentoId: string) =>
    `${COLLECTIONS.agendamentos}/${assertIdSegment(agendamentoId, "agendamentoId")}`,

  /** Collection de disponibilidade (um documento por data). */
  disponibilidade: () => COLLECTIONS.disponibilidade,
  /** Documento de disponibilidade de uma data (`YYYY-MM-DD`). */
  disponibilidadeDoDia: (isoDate: string) =>
    `${COLLECTIONS.disponibilidade}/${assertIdSegment(isoDate, "isoDate")}`,

  /** Collection de configurações. */
  configuracoes: () => COLLECTIONS.configuracoes,
  /** Collection de textos do pós-agendamento. */
  posAgendamento: () => COLLECTIONS.posAgendamento,
  /** Documento com título e descrição do pós-agendamento. */
  posAgendamentoTextos: () =>
    `${COLLECTIONS.posAgendamento}/${POS_AGENDAMENTO_DOCS.textos}`,
  /** Documento de cores da área do cliente. */
  configuracaoAparencia: () =>
    `${COLLECTIONS.configuracoes}/${CONFIG_DOCS.aparencia}`,
  /** Documento de textos exibidos após a solicitação. */
  configuracaoPosAgendamento: () =>
    `${COLLECTIONS.configuracoes}/${CONFIG_DOCS.posAgendamento}`,
  /** Documento do profissional único da v1. */
  configuracaoProfissional: () =>
    `${COLLECTIONS.configuracoes}/${CONFIG_DOCS.profissional}`,
  /** Credenciais criptografadas e metadados da integração Google Calendar. */
  configuracaoGoogleCalendar: () =>
    `${COLLECTIONS.configuracoes}/${CONFIG_DOCS.googleCalendar}`,
} as const;

/**
 * Valida um segmento de caminho Firestore.
 *
 * Rejeita vazio, `/` (atravessaria níveis) e os segmentos reservados `.`/`..`.
 */
function assertIdSegment(value: string, fieldName: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.includes("/") || trimmed === "." || trimmed === "..") {
    throw new AppError("validation", "Identificador inválido.", {
      fieldErrors: { [fieldName]: "Identificador inválido." },
    });
  }

  return trimmed;
}
