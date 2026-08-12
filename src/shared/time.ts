import { dominioTexts } from "@/src/shared/constants/texts";
import { AppError } from "@/src/shared/errors";

/**
 * Helpers de data/hora pt-BR.
 *
 * Decisão: formatação por manipulação de string sobre os formatos canônicos
 * (`YYYY-MM-DD` e `HH:mm`), sem `Intl`/`Date` na saída. Motivo: `Date` aplica
 * fuso do runtime e deslocaria o dia entre servidor e navegador, e `Intl`
 * depende do locale instalado. Assim o resultado é determinístico em qualquer
 * ambiente — inclusive nos testes.
 */

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_OF_DAY_PATTERN = /^(\d{2}):(\d{2})$/;

/**
 * Fuso da operação, como offset fixo.
 *
 * Data/horário de um agendamento são hora local do estabelecimento (pt-BR), e
 * comparar isso com "agora" exige um fuso. `America/Sao_Paulo` não observa
 * horário de verão desde 2019, então o offset constante `-03:00` é suficiente e
 * — diferente de `new Date(ano, mes, dia, ...)`, que usaria o fuso do runtime —
 * produz o mesmo instante no servidor, no navegador e no CI.
 */
const OPERATION_UTC_OFFSET = "-03:00";

/**
 * O MESMO offset em milissegundos, derivado da constante acima.
 *
 * É derivado, e não escrito à mão como `-3 * 60 * 60 * 1000`, para o fuso da
 * operação existir uma única vez no código: quem precisar deslocar um instante
 * absoluto (`formatInstantPtBr`) usa este valor em vez de recriar o `-03:00`.
 */
const OPERATION_UTC_OFFSET_MS = utcOffsetToMs(OPERATION_UTC_OFFSET);

/** `true` para data no formato `YYYY-MM-DD` que existe no calendário. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;

  return true;
}

/** `true` para horário no formato `HH:mm` de 24 horas. */
export function isTimeOfDay(value: string): boolean {
  const match = TIME_OF_DAY_PATTERN.exec(value);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** `2026-08-15` → `15/08/2026`. */
export function formatDatePtBr(isoDate: string): string {
  if (!isIsoDate(isoDate)) {
    throw new AppError("validation", dominioTexts.dataInvalida);
  }

  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** `2026-08-15` → `15/08` (uso denso, como o card de agendamento). */
export function formatShortDatePtBr(isoDate: string): string {
  if (!isIsoDate(isoDate)) {
    throw new AppError("validation", dominioTexts.dataInvalida);
  }

  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

/** `9:5` → `09:05`; rejeita horário inexistente. */
export function formatTimePtBr(timeOfDay: string): string {
  const normalized = normalizeTimeOfDay(timeOfDay);
  if (!isTimeOfDay(normalized)) {
    throw new AppError("validation", dominioTexts.horarioInvalido);
  }

  return normalized;
}

/** `2026-08-15`, `09:00` → `15/08/2026 às 09:00`. */
export function formatDateTimePtBr(isoDate: string, timeOfDay: string): string {
  return `${formatDatePtBr(isoDate)} às ${formatTimePtBr(timeOfDay)}`;
}

/**
 * `2026-08-14T17:32:00.000Z` → `14/08/2026 às 14:32` (hora local da operação).
 *
 * Complementa `formatDateTimePtBr`: aquele recebe os formatos canônicos do
 * agendamento (`YYYY-MM-DD` + `HH:mm`), que JÁ são hora local; este parte de um
 * instante absoluto ISO-8601 — um timestamp de confirmação, por exemplo — e o
 * traz para a hora da operação usando o offset canônico deste módulo.
 *
 * Somar o offset e reler o resultado em UTC (`toISOString`) mantém a saída
 * idêntica no servidor, no navegador e no CI, sem depender do fuso do runtime.
 */
export function formatInstantPtBr(isoInstant: string): string {
  const instante = Date.parse(isoInstant);
  if (Number.isNaN(instante)) {
    throw new AppError("validation", dominioTexts.dataInvalida);
  }

  const [isoDate, time] = new Date(instante + OPERATION_UTC_OFFSET_MS)
    .toISOString()
    .split("T");

  return formatDateTimePtBr(isoDate, time.slice(0, 5));
}

/**
 * `2026-08-15`, `09:00` → instante absoluto do atendimento.
 *
 * Exige os formatos canônicos: quem recebe dado de fora normaliza antes
 * (`assertIsoDate`/`assertTimeOfDay` em `shared/validators`), para o domínio nunca
 * comparar instante adivinhado.
 */
export function toAppointmentInstant(isoDate: string, timeOfDay: string): Date {
  if (!isIsoDate(isoDate)) {
    throw new AppError("validation", dominioTexts.dataInvalida);
  }

  if (!isTimeOfDay(timeOfDay)) {
    throw new AppError("validation", dominioTexts.horarioInvalido);
  }

  return new Date(`${isoDate}T${timeOfDay}:00.000${OPERATION_UTC_OFFSET}`);
}

/**
 * `true` quando o instante do atendimento já chegou em relação a `now`.
 *
 * `now` é parâmetro obrigatório (nunca `Date.now()` interno): o instante de
 * referência pertence a quem chama — assim uma listagem deriva o estado de
 * todos os itens contra o MESMO relógio, e o resultado é determinístico.
 */
export function hasAppointmentInstantArrived(
  isoDate: string,
  timeOfDay: string,
  now: Date,
): boolean {
  return now.getTime() >= toAppointmentInstant(isoDate, timeOfDay).getTime();
}

/**
 * Data ISO de "hoje" na hora da operação (`-03:00`), não a data UTC do runtime.
 *
 * Usada como data padrão da Agenda quando a rota não recebe `data` na query
 * string. Sem o deslocamento, um servidor rodando em UTC mostraria o dia
 * seguinte como "hoje" entre 21h e meia-noite no horário de Brasília — mesmo
 * raciocínio de `formatInstantPtBr`, aplicado a "agora" em vez de um instante
 * de confirmação.
 */
export function todayIsoDate(now: Date = new Date()): string {
  const [isoDate] = new Date(now.getTime() + OPERATION_UTC_OFFSET_MS)
    .toISOString()
    .split("T");

  return isoDate;
}

/**
 * `9:5` → `09:05`. Devolve a entrada intacta quando ela não tem a forma de
 * horário — validar é de quem chama (`isTimeOfDay`), aqui só se completa o zero.
 */
export function normalizeTimeOfDay(timeOfDay: string): string {
  const parts = timeOfDay.split(":");
  if (parts.length !== 2) return timeOfDay;

  const [hours, minutes] = parts;
  if (!/^\d{1,2}$/.test(hours) || !/^\d{1,2}$/.test(minutes)) return timeOfDay;

  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

/**
 * `true` quando o horário JÁ está na forma canônica `HH:mm` (`09:00`, não `9:00`).
 *
 * É uma pergunta, não uma asserção: quem varre as chaves de um documento
 * persistido precisa descartar a chave fora do padrão, e capturar exceção para
 * decidir isso transformaria erro em controle de fluxo.
 */
export function isCanonicalTimeOfDay(value: string): boolean {
  return isTimeOfDay(value) && normalizeTimeOfDay(value) === value;
}

/**
 * `-03:00` → `-10800000`.
 *
 * Total de propósito (sem lançar): a única entrada é a constante literal do
 * módulo, então um erro aqui seria erro de digitação em tempo de escrita, não
 * dado de fora — e lançar na inicialização do módulo derrubaria o processo.
 */
function utcOffsetToMs(offset: string): number {
  const sign = offset.startsWith("-") ? -1 : 1;
  const [hours, minutes] = offset.slice(1).split(":").map(Number);

  return sign * (hours * 60 + minutes) * 60_000;
}

function daysInMonth(year: number, month: number): number {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1];
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
