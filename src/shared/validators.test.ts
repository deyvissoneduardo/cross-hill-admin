import { describe, expect, it } from "vitest";

import { dominioTexts } from "@/src/shared/constants/texts";
import { AppError } from "@/src/shared/errors";
import {
  asTrimmedString,
  assertIsoDate,
  assertTimeOfDay,
} from "@/src/shared/validators";

/**
 * Validadores de campo compartilhados por `agenda` e `agendamentos`.
 *
 * O que estes testes protegem é a regra ser UMA: se `agenda` aceitasse um horário
 * que a reserva rejeita, existiria slot salvo que nenhum cliente consegue
 * solicitar. Por isso as asserções são sobre normalização (o valor devolvido) e
 * sobre `fieldErrors` (o campo que a UI destaca), não só sobre "lançou".
 */

/** Captura o `AppError` lançado, falhando se nada for lançado. */
function captureAppError(run: () => unknown): AppError {
  try {
    run();
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }

  throw new Error("esperava AppError, mas nada foi lançado");
}

describe("asTrimmedString", () => {
  it("remove espaço das pontas", () => {
    expect(asTrimmedString("  Ana Souza  ", "cliente", "Informe.")).toBe("Ana Souza");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["número", 9],
    ["objeto", { horario: "09:00" }],
  ])("rejeita entrada que não é string (%s)", (_caso, value) => {
    const erro = captureAppError(() => asTrimmedString(value, "cliente", "Informe."));

    expect(erro.code).toBe("validation");
    expect(erro.message).toBe("Informe.");
    expect(erro.fieldErrors).toEqual({ cliente: "Informe." });
  });
});

describe("assertIsoDate", () => {
  it.each(["2026-08-15", "  2026-08-15  ", "2024-02-29"])(
    "aceita e normaliza data canônica (%s)",
    (entrada) => {
      expect(assertIsoDate(entrada)).toBe(entrada.trim());
    },
  );

  it.each([
    ["dia que não existe no mês", "2026-02-29"],
    ["mês fora da faixa", "2026-13-01"],
    ["formato pt-BR", "15/08/2026"],
    ["sem zero à esquerda", "2026-8-15"],
    ["vazio", ""],
    ["não é string", 20260815],
  ])("rejeita %s no campo data", (_caso, entrada) => {
    const erro = captureAppError(() => assertIsoDate(entrada));

    expect(erro.code).toBe("validation");
    expect(erro.message).toBe(dominioTexts.dataInvalida);
    expect(erro.fieldErrors).toEqual({ data: dominioTexts.dataInvalida });
  });
});

describe("assertTimeOfDay", () => {
  it.each([
    ["09:00", "09:00"],
    // Normaliza para a forma canônica — é o que evita duas grafias do mesmo
    // horário virarem duas chaves no documento do dia.
    ["9:5", "09:05"],
    ["  9:00  ", "09:00"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
  ])("%s → %s", (entrada, esperado) => {
    expect(assertTimeOfDay(entrada)).toBe(esperado);
  });

  it.each([
    ["hora fora da faixa", "24:00"],
    ["minuto fora da faixa", "09:60"],
    ["separador errado", "09h00"],
    ["vazio", ""],
    ["não é string", null],
  ])("rejeita %s no campo horario", (_caso, entrada) => {
    const erro = captureAppError(() => assertTimeOfDay(entrada));

    expect(erro.code).toBe("validation");
    expect(erro.message).toBe(dominioTexts.horarioInvalido);
    expect(erro.fieldErrors).toEqual({ horario: dominioTexts.horarioInvalido });
  });
});
