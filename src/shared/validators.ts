import { dominioTexts } from "@/src/shared/constants/texts";
import { fieldError } from "@/src/shared/errors";
import { isIsoDate, isTimeOfDay, normalizeTimeOfDay } from "@/src/shared/time";

/**
 * Validadores de campo compartilhados entre features.
 *
 * Por que aqui e não dentro de uma feature: data (`YYYY-MM-DD`) e horário
 * (`HH:mm`) são o vocabulário de `agenda` E de `agendamentos` — a agenda não pode
 * salvar um horário que a reserva rejeitaria, então a regra tem de ser uma só. Com
 * a regra morando em `agendamentos`, `agenda` precisava importar da feature
 * vizinha, que por sua vez importa as primitivas transacionais de slot de
 * `agenda`: um ciclo entre features nascido da colocação do código, não da
 * dependência real. Aqui, as duas features dependem apenas de `shared`.
 *
 * Cada função **valida e normaliza**: devolve o valor no formato canônico ou
 * lança `AppError("validation")` com `fieldErrors` no nome do campo do formulário.
 * A entrada é `unknown` de propósito — o valor vem de `FormData`/Server Action ou
 * de documento persistido, onde nada garante o tipo declarado.
 */

/**
 * Coage a entrada em `string` sem espaço às pontas, ou falha no campo.
 *
 * É a porta de entrada de todo validador: `typeof value !== "string"` cobre de uma
 * vez `undefined`, `null`, número e `File` vindos de `FormData`/Firestore.
 */
export function asTrimmedString(
  value: unknown,
  field: string,
  message: string,
): string {
  if (typeof value !== "string") {
    throw fieldError(field, message);
  }

  return value.trim();
}

/** Data no formato canônico `YYYY-MM-DD` que existe no calendário. */
export function assertIsoDate(value: unknown): string {
  const data = asTrimmedString(value, "data", dominioTexts.dataInvalida);

  if (!isIsoDate(data)) {
    throw fieldError("data", dominioTexts.dataInvalida);
  }

  return data;
}

/** Horário `HH:mm`; aceita `9:5` na entrada e normaliza para `09:05`. */
export function assertTimeOfDay(value: unknown): string {
  const bruto = asTrimmedString(value, "horario", dominioTexts.horarioInvalido);
  const horario = normalizeTimeOfDay(bruto);

  if (!isTimeOfDay(horario)) {
    throw fieldError("horario", dominioTexts.horarioInvalido);
  }

  return horario;
}
