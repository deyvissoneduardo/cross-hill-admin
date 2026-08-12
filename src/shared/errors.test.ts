import { afterEach, describe, expect, it, vi } from "vitest";

import { dominioTexts } from "@/src/shared/constants/texts";
import {
  AppError,
  actionFail,
  actionOk,
  fieldError,
  isAppError,
  toActionResult,
  withDomainErrors,
} from "@/src/shared/errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppError", () => {
  it("preserva código, mensagem e erros de campo", () => {
    const error = new AppError("validation", "Dados inválidos.", {
      fieldErrors: { email: "Informe um e-mail válido." },
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("validation");
    expect(error.message).toBe("Dados inválidos.");
    expect(error.fieldErrors).toEqual({ email: "Informe um e-mail válido." });
  });

  it("não confunde erro comum com erro de domínio", () => {
    expect(isAppError(new AppError("conflict", "Horário indisponível."))).toBe(true);
    expect(isAppError(new TypeError("boom"))).toBe(false);
    expect(isAppError("unauthorized")).toBe(false);
  });
});

describe("actionOk / actionFail", () => {
  it("monta resultado de sucesso serializável", () => {
    expect(actionOk({ id: "ag-1" }, "Agendamento atualizado.")).toEqual({
      ok: true,
      data: { id: "ag-1" },
      message: "Agendamento atualizado.",
    });
  });

  it("monta resultado de falha com código e erros de campo", () => {
    expect(
      actionFail("validation", "Ajuste os campos destacados.", { titulo: "Obrigatório." }),
    ).toEqual({
      ok: false,
      code: "validation",
      message: "Ajuste os campos destacados.",
      fieldErrors: { titulo: "Obrigatório." },
    });
  });
});

describe("toActionResult", () => {
  it("propaga mensagem e código de erro de domínio", () => {
    const error = new AppError("conflict", "Horário indisponível.", {
      fieldErrors: { horario: "Escolha outro horário." },
    });

    expect(toActionResult(error, "Falha inesperada.")).toEqual({
      ok: false,
      code: "conflict",
      message: "Horário indisponível.",
      fieldErrors: { horario: "Escolha outro horário." },
    });
  });

  it("substitui erro inesperado pela mensagem de fallback sem vazar detalhe interno", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = toActionResult(
      new TypeError("firestore: PERMISSION_DENIED em projects/cliente-real"),
      "Não foi possível concluir a ação. Tente novamente.",
      "confirmarAgendamento",
    );

    expect(result).toEqual({
      ok: false,
      code: "unexpected",
      message: "Não foi possível concluir a ação. Tente novamente.",
    });
    expect(JSON.stringify(result)).not.toContain("PERMISSION_DENIED");

    // O log server-side registra apenas contexto e tipo — nunca a mensagem crua.
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("[erro-inesperado]", {
      context: "confirmarAgendamento",
      tipo: "TypeError",
    });
  });

  it("registra contexto padrão quando o chamador não informa um", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    toActionResult("falha crua", "Não foi possível concluir a ação. Tente novamente.");

    expect(consoleError).toHaveBeenCalledWith("[erro-inesperado]", {
      context: "desconhecido",
      tipo: "string",
    });
  });
});

describe("fieldError", () => {
  it("usa a mesma mensagem no erro e no campo destacado", () => {
    const erro = fieldError("horario", "Horário inválido.");

    expect(erro.code).toBe("validation");
    expect(erro.message).toBe("Horário inválido.");
    expect(erro.fieldErrors).toEqual({ horario: "Horário inválido." });
  });
});

/**
 * Política de erro da camada de service, compartilhada por `bookingService` e
 * `availabilityService` (antes duplicada byte a byte nos dois).
 */
describe("withDomainErrors", () => {
  it("devolve o resultado quando a operação conclui", async () => {
    await expect(
      withDomainErrors("agendamentos", "listagem", async () => ["ag-1"]),
    ).resolves.toEqual(["ag-1"]);
  });

  it("repassa AppError intacta, sem logar nem reescrever a mensagem", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const previsto = new AppError("conflict", "Horário indisponível.");

    const erro = await withDomainErrors("agendamentos", "reserva", async () => {
      throw previsto;
    }).catch((capturado: unknown) => capturado);

    // A MESMA instância: a mensagem previsível já está pronta para a UI.
    expect(erro).toBe(previsto);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("converte falha de infraestrutura em unavailable sem vazar detalhe do SDK", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const cru = new TypeError("firestore: PERMISSION_DENIED em projects/cliente-real");

    const erro = (await withDomainErrors("agenda", "salvar-agenda", async () => {
      throw cru;
    }).catch((capturado: unknown) => capturado)) as AppError;

    expect(isAppError(erro)).toBe(true);
    expect(erro.code).toBe("unavailable");
    expect(erro.message).toBe(dominioTexts.servicoIndisponivel);
    expect(erro.message).not.toContain("PERMISSION_DENIED");
    // O motivo real fica disponível server-side, nunca na mensagem.
    expect(erro.cause).toBe(cru);

    // Log com o prefixo da feature, sem stack nem mensagem crua.
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("[agenda] falha inesperada", {
      acao: "salvar-agenda",
      tipo: "TypeError",
    });
  });

  it("registra o tipo mesmo quando o lançado não é Error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      withDomainErrors("agendamentos", "confirmacao", async () => {
        throw "falha crua";
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(consoleError).toHaveBeenCalledWith("[agendamentos] falha inesperada", {
      acao: "confirmacao",
      tipo: "string",
    });
  });
});
