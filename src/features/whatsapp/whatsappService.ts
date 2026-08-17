import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { dominioTexts } from "@/src/shared/constants/texts";
import { fieldError } from "@/src/shared/errors";
import { formatDateTimePtBr } from "@/src/shared/time";

/**
 * Mensagem e URL de conversa para comunicar confirmação/cancelamento ao
 * cliente (PRD US-04/US-07, tech_spec §CA-06).
 *
 * Funções puras, sem I/O e sem provedor de mensagem: o texto é montado aqui e
 * o administrador decide como enviá-lo (ex.: abrindo `buildWhatsAppUrl` numa
 * nova aba). Nenhum envio automático é implementado nesta task.
 */

/** Ação que originou a comunicação com o cliente. */
export type CustomerMessageAction = "confirmacao" | "cancelamento";

/** Situação descrita na mensagem, por ação. */
const ACTION_SITUATION: Record<CustomerMessageAction, string> = {
  confirmacao: "confirmado",
  cancelamento: "cancelado",
};

/**
 * Mensagem para o cliente sobre a confirmação/cancelamento do agendamento.
 *
 * Exige nome do cliente, profissional, data e horário — os quatro dados que a
 * mensagem precisa exibir. Telefone NÃO é exigido aqui: ele só é necessário
 * para montar a URL de conversa (`buildWhatsAppUrl`), não para o texto em si.
 * Payload incompleto lança `AppError("validation")`, e nenhuma mensagem
 * parcial é devolvida.
 */
export function buildCustomerMessage(
  agendamento: AppointmentDTO,
  acao: CustomerMessageAction,
): string {
  const cliente = assertRequired(
    agendamento.cliente,
    "cliente",
    dominioTexts.clienteObrigatorio,
  );
  const profissional = assertRequired(
    agendamento.profissional,
    "profissional",
    dominioTexts.profissionalObrigatorio,
  );
  // Valida e formata data + horário num só passo — lança `AppError("validation")`
  // tanto para formato inválido quanto para valor ausente (string vazia).
  const dataHorario = formatDateTimePtBr(agendamento.data, agendamento.horario);
  const situacao = ACTION_SITUATION[acao];

  return `Olá, ${cliente}! Seu agendamento com ${profissional} em ${dataHorario} foi ${situacao}.`;
}

/**
 * URL de conversa do WhatsApp (`wa.me`) já com a mensagem do cliente
 * codificada. Telefone é obrigatório aqui (mesmo não sendo exigido por
 * `buildCustomerMessage`): sem ele não há conversa para abrir, e o payload é
 * tratado como incompleto — `AppError("validation")`, nenhuma URL parcial.
 */
export function buildWhatsAppUrl(
  agendamento: AppointmentDTO,
  acao: CustomerMessageAction,
): string {
  const mensagem = buildCustomerMessage(agendamento, acao);
  const telefone = assertRequired(
    agendamento.telefone,
    "telefone",
    dominioTexts.telefoneInvalido,
  ).replace(/\D/g, "");

  // `wa.me` exige o código do país. Documentos antigos já podem trazê-lo;
  // números brasileiros no formato interno (DDD + número) recebem `55` aqui.
  const telefoneInternacional =
    telefone.startsWith("55") && (telefone.length === 12 || telefone.length === 13)
      ? telefone
      : `55${telefone}`;

  return `https://wa.me/${telefoneInternacional}?text=${encodeURIComponent(mensagem)}`;
}

/** Campo obrigatório: string não vazia após remover espaço nas pontas. */
function assertRequired(value: string, field: string, message: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed.length === 0) {
    throw fieldError(field, message);
  }

  return trimmed;
}
