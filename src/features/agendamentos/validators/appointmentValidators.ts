import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/src/features/agendamentos/types";
import { dominioTexts } from "@/src/shared/constants/texts";
import { fieldError } from "@/src/shared/errors";
import {
  asTrimmedString,
  assertIsoDate,
  assertTimeOfDay,
} from "@/src/shared/validators";

/**
 * Validadores de agendamento (tech_spec §10.3 — sem biblioteca externa).
 *
 * Cada função **valida e normaliza**: devolve o valor no formato canônico que o
 * domínio grava (telefone só com dígitos, texto sem espaço às pontas) ou lança
 * `AppError("validation")` com `fieldErrors` no nome do campo do formulário. Assim
 * o service não precisa saber a mensagem de cada campo, e um valor que passou por
 * aqui é confiável para o Firestore e para o `time.ts`.
 *
 * A entrada é `unknown` de propósito: o payload vem de `FormData`/Server Action,
 * onde nada garante o tipo declarado.
 *
 * `assertIsoDate`/`assertTimeOfDay` são reexportados de `shared/validators`, onde
 * moram de fato: data e horário são vocabulário compartilhado com a feature
 * `agenda`, e mantê-los aqui obrigava `agenda` a importar de `agendamentos` (ciclo
 * entre features). A superfície `appointmentValidators.assertIsoDate` /
 * `.assertTimeOfDay` continua valendo para quem já os consome.
 */

/** Firestore aceita ids maiores, mas 128 já é folgado para id gerado por nós. */
const MAX_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 80;
const MIN_TEXT_LENGTH = 2;
/** DDD + 8 (fixo) ou 9 (celular) dígitos. */
const PHONE_DIGITS_PATTERN = /^\d{10,11}$/;
/** Caracteres de controle quebram log e exibição — nome/profissional não os têm. */
const CONTROL_CHARS_PATTERN = /[\u0000-\u001f\u007f]/;

export const appointmentValidators = {
  /**
   * Id de agendamento. Rejeita `/` porque um segmento com barra atravessaria
   * níveis do caminho Firestore (mesma guarda de `firestorePaths`).
   */
  assertAppointmentId(value: unknown): string {
    const id = asTrimmedString(
      value,
      "agendamentoId",
      dominioTexts.agendamentoInvalido,
    );

    if (
      id.length === 0 ||
      id.length > MAX_ID_LENGTH ||
      id.includes("/") ||
      id === "." ||
      id === ".."
    ) {
      throw fieldError("agendamentoId", dominioTexts.agendamentoInvalido);
    }

    return id;
  },

  /** Data canônica `YYYY-MM-DD` — implementação em `shared/validators`. */
  assertIsoDate,

  /** Horário canônico `HH:mm` — implementação em `shared/validators`. */
  assertTimeOfDay,

  /** Nome do cliente. */
  assertCustomerName(value: unknown): string {
    return assertText(value, "cliente", dominioTexts.clienteObrigatorio);
  },

  /** Nome do profissional (único na v1, vindo da configuração). */
  assertProfessional(value: unknown): string {
    return assertText(value, "profissional", dominioTexts.profissionalObrigatorio);
  },

  /**
   * Telefone brasileiro. Normaliza para somente dígitos — é o formato que a URL
   * de conversa consome e o que evita duas grafias do mesmo número no banco.
   */
  assertPhone(value: unknown): string {
    const bruto = asTrimmedString(value, "telefone", dominioTexts.telefoneInvalido);
    const digitos = bruto.replace(/\D/g, "");

    if (!PHONE_DIGITS_PATTERN.test(digitos)) {
      throw fieldError("telefone", dominioTexts.telefoneInvalido);
    }

    return digitos;
  },

  /** Status canônico — barra valor fora do domínio vindo de documento/payload. */
  assertStatus(value: unknown): AppointmentStatus {
    const status = asTrimmedString(value, "status", dominioTexts.statusInvalido);

    if (!APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
      throw fieldError("status", dominioTexts.statusInvalido);
    }

    return status as AppointmentStatus;
  },
} as const;

function assertText(value: unknown, field: string, message: string): string {
  const texto = asTrimmedString(value, field, message);

  if (
    texto.length < MIN_TEXT_LENGTH ||
    texto.length > MAX_TEXT_LENGTH ||
    CONTROL_CHARS_PATTERN.test(texto)
  ) {
    throw fieldError(field, message);
  }

  return texto;
}
