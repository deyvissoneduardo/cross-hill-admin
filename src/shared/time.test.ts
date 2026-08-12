import { describe, expect, it } from "vitest";

import { AppError } from "@/src/shared/errors";
import {
  formatDatePtBr,
  formatDateTimePtBr,
  formatInstantPtBr,
  formatShortDatePtBr,
  formatTimePtBr,
  hasAppointmentInstantArrived,
  isCanonicalTimeOfDay,
  isIsoDate,
  isTimeOfDay,
  normalizeTimeOfDay,
  toAppointmentInstant,
  todayIsoDate,
} from "@/src/shared/time";

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

describe("isIsoDate", () => {
  it.each([
    ["2026-08-15", true],
    ["2024-02-29", true],
    ["2026-02-29", false],
    ["2026-13-01", false],
    ["2026-08-32", false],
    ["2026-8-15", false],
    ["15/08/2026", false],
    ["", false],
  ])("%s → %s", (value, expected) => {
    expect(isIsoDate(value)).toBe(expected);
  });
});

describe("isTimeOfDay", () => {
  it.each([
    ["00:00", true],
    ["09:30", true],
    ["23:59", true],
    ["24:00", false],
    ["09:60", false],
    ["9:00", false],
    ["09h00", false],
    ["", false],
  ])("%s → %s", (value, expected) => {
    expect(isTimeOfDay(value)).toBe(expected);
  });
});

describe("isCanonicalTimeOfDay", () => {
  it.each([
    // Já canônico.
    ["00:00", true],
    ["09:05", true],
    ["23:59", true],
    // Válido como horário, mas não na forma canônica — normalizar mudaria o valor.
    ["9:05", false],
    ["09:5", false],
    // Nem horário.
    ["24:00", false],
    ["09h00", false],
    ["", false],
  ])("%s → %s", (value, expected) => {
    expect(isCanonicalTimeOfDay(value)).toBe(expected);
  });

  it("responde sem lançar para entrada arbitrária (é pergunta, não asserção)", () => {
    expect(() => isCanonicalTimeOfDay("qualquer coisa")).not.toThrow();
    expect(isCanonicalTimeOfDay("qualquer coisa")).toBe(false);
  });
});

describe("formatDatePtBr", () => {
  it("converte data ISO para o formato pt-BR", () => {
    expect(formatDatePtBr("2026-08-15")).toBe("15/08/2026");
  });

  it("rejeita data inexistente no calendário com código de validação", () => {
    const error = captureAppError(() => formatDatePtBr("2026-02-30"));

    expect(error.code).toBe("validation");
    expect(error.message).toBe("Data inválida.");
  });
});

describe("formatShortDatePtBr", () => {
  it("devolve dia e mês para uso denso no card", () => {
    expect(formatShortDatePtBr("2026-08-15")).toBe("15/08");
  });

  it("rejeita data fora do formato ISO", () => {
    expect(captureAppError(() => formatShortDatePtBr("15/08/2026")).code).toBe(
      "validation",
    );
  });
});

describe("formatTimePtBr", () => {
  it("normaliza horário com um dígito para HH:mm", () => {
    expect(formatTimePtBr("9:5")).toBe("09:05");
  });

  it("rejeita horário inexistente com código de validação", () => {
    const error = captureAppError(() => formatTimePtBr("24:00"));

    expect(error.code).toBe("validation");
    expect(error.message).toBe("Horário inválido.");
  });
});

describe("formatDateTimePtBr", () => {
  it("combina data e horário em texto pt-BR", () => {
    expect(formatDateTimePtBr("2026-08-15", "09:00")).toBe("15/08/2026 às 09:00");
  });

  it("rejeita a combinação quando o horário é inválido", () => {
    expect(captureAppError(() => formatDateTimePtBr("2026-08-15", "99:99")).code).toBe(
      "validation",
    );
  });
});

describe("formatInstantPtBr", () => {
  it("traz o instante absoluto para a hora da operação (-03:00)", () => {
    expect(formatInstantPtBr("2026-08-14T17:32:00.000Z")).toBe("14/08/2026 às 14:32");
  });

  it("recua o dia quando o offset atravessa a meia-noite UTC", () => {
    expect(formatInstantPtBr("2026-08-15T02:00:00.000Z")).toBe("14/08/2026 às 23:00");
  });

  it("rejeita instante ilegível com código de validação", () => {
    const error = captureAppError(() => formatInstantPtBr("ontem à tarde"));

    expect(error.code).toBe("validation");
    expect(error.message).toBe("Data inválida.");
  });
});

describe("normalizeTimeOfDay", () => {
  it.each([
    ["9:5", "09:05"],
    ["09:05", "09:05"],
    // Sem forma de horário, a entrada volta intacta para o chamador validar.
    ["09h05", "09h05"],
  ])("%s → %s", (value, expected) => {
    expect(normalizeTimeOfDay(value)).toBe(expected);
  });
});

describe("toAppointmentInstant", () => {
  it("resolve data e horário no fuso da operação (-03:00)", () => {
    // 09:00 em São Paulo é 12:00Z — o instante não pode depender do fuso do runtime.
    expect(toAppointmentInstant("2026-08-15", "09:00").toISOString()).toBe(
      "2026-08-15T12:00:00.000Z",
    );
  });

  it("rejeita horário fora do formato canônico", () => {
    const error = captureAppError(() => toAppointmentInstant("2026-08-15", "9:00"));

    expect(error.code).toBe("validation");
    expect(error.message).toBe("Horário inválido.");
  });

  it("rejeita data inexistente no calendário", () => {
    const error = captureAppError(() => toAppointmentInstant("2026-02-30", "09:00"));

    expect(error.code).toBe("validation");
    expect(error.message).toBe("Data inválida.");
  });
});

describe("todayIsoDate", () => {
  it("usa a data da operação (-03:00), não a data UTC do instante", () => {
    // 2026-08-15T02:00:00.000Z é 14/08 às 23h em São Paulo: ainda é o dia
    // anterior na operação, mesmo já sendo 15/08 em UTC.
    expect(todayIsoDate(new Date("2026-08-15T02:00:00.000Z"))).toBe("2026-08-14");
  });

  it("recua a data quando o instante UTC já cruzou a meia-noite do dia seguinte", () => {
    expect(todayIsoDate(new Date("2026-08-14T23:00:00.000Z"))).toBe("2026-08-14");
    expect(todayIsoDate(new Date("2026-08-15T03:00:00.000Z"))).toBe("2026-08-15");
  });
});

describe("hasAppointmentInstantArrived", () => {
  it.each([
    // Um milissegundo antes do atendimento: ainda não chegou.
    ["2026-08-15T11:59:59.999Z", false],
    // No instante exato: chegou (a fronteira pertence ao "chegou").
    ["2026-08-15T12:00:00.000Z", true],
    ["2026-08-15T12:00:00.001Z", true],
  ])("agora=%s → %s", (agora, expected) => {
    expect(
      hasAppointmentInstantArrived("2026-08-15", "09:00", new Date(agora)),
    ).toBe(expected);
  });
});
