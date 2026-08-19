import { describe, expect, it } from "vitest";

import { firestorePaths } from "@/src/firebase/firestorePaths";
import { AppError } from "@/src/shared/errors";

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

describe("firestorePaths", () => {
  it("monta os caminhos canônicos de collections e documentos fixos", () => {
    expect(firestorePaths.agendamentos()).toBe("agendamentos");
    expect(firestorePaths.disponibilidade()).toBe("disponibilidade");
    expect(firestorePaths.configuracoes()).toBe("configuracoes");
    expect(firestorePaths.posAgendamento()).toBe("pos_agendamento");
    expect(firestorePaths.posAgendamentoTextos()).toBe("pos_agendamento/textos");
    expect(firestorePaths.configuracaoAparencia()).toBe("configuracoes/aparencia");
    expect(firestorePaths.configuracaoPosAgendamento()).toBe(
      "configuracoes/pos-agendamento",
    );
    expect(firestorePaths.configuracaoProfissional()).toBe("configuracoes/profissional");
  });

  it("monta caminhos de documento a partir do identificador recebido", () => {
    expect(firestorePaths.agendamento("ag-123")).toBe("agendamentos/ag-123");
    expect(firestorePaths.disponibilidadeDoDia("2026-08-15")).toBe(
      "disponibilidade/2026-08-15",
    );
  });

  it("descarta espaços em volta do identificador", () => {
    expect(firestorePaths.agendamento("  ag-123  ")).toBe("agendamentos/ag-123");
  });

  it.each([
    ["", "vazio"],
    ["   ", "somente espaços"],
    ["ag/123", "com barra"],
    ["../configuracoes/aparencia", "atravessando níveis"],
    [".", "segmento reservado"],
    ["..", "segmento reservado duplo"],
  ])("rejeita identificador %s (%s)", (identificador) => {
    const error = captureAppError(() => firestorePaths.agendamento(identificador));

    expect(error.code).toBe("validation");
    expect(error.fieldErrors).toEqual({ agendamentoId: "Identificador inválido." });
  });

  it("nomeia o campo inválido conforme o argumento recebido", () => {
    const error = captureAppError(() => firestorePaths.disponibilidadeDoDia("2026/08/15"));

    expect(error.fieldErrors).toEqual({ isoDate: "Identificador inválido." });
  });
});
