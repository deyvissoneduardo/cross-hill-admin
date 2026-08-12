import { describe, expect, it } from "vitest";

import { type AppointmentDTO } from "@/src/features/agendamentos/types";
import { buildCustomerMessage, buildWhatsAppUrl } from "@/src/features/whatsapp/whatsappService";
import { AppError, isAppError } from "@/src/shared/errors";

/**
 * CT-07/CT-08 (T3.md §6): mensagem e URL de comunicação com o cliente.
 *
 * Função pura, sem colaborador — chamada direta, sem mock (T3.md §6.0).
 */

const AGENDAMENTO_VALIDO: AppointmentDTO = {
  id: "ag-1",
  cliente: "Maria Silva",
  telefone: "11987654321",
  profissional: "Ana Souza",
  data: "2026-08-15",
  horario: "09:00",
  status: "aguardando_agendamento",
  adminConfirmadoEm: null,
  profissionalConfirmadoEm: null,
  confirmadoPrimeiroPor: null,
  canceladoEm: null,
};

const MENSAGEM_CONFIRMACAO =
  "Olá, Maria Silva! Seu agendamento com Ana Souza em 15/08/2026 às 09:00 foi confirmado.";

describe("buildCustomerMessage", () => {
  it("CT-07: inclui nome, data, horário e profissional na confirmação", () => {
    const mensagem = buildCustomerMessage(AGENDAMENTO_VALIDO, "confirmacao");

    expect(mensagem).toBe(MENSAGEM_CONFIRMACAO);
  });

  it("CT-07: inclui nome, data, horário e profissional no cancelamento", () => {
    const mensagem = buildCustomerMessage(AGENDAMENTO_VALIDO, "cancelamento");

    expect(mensagem).toBe(
      "Olá, Maria Silva! Seu agendamento com Ana Souza em 15/08/2026 às 09:00 foi cancelado.",
    );
  });

  it("CT-08: rejeita profissional vazio com AppError de validação, sem devolver mensagem", () => {
    const incompleto: AppointmentDTO = { ...AGENDAMENTO_VALIDO, profissional: "" };

    let erro: unknown;
    let mensagem: string | undefined;
    try {
      mensagem = buildCustomerMessage(incompleto, "confirmacao");
    } catch (capturado) {
      erro = capturado;
    }

    expect(mensagem).toBeUndefined();
    expect(isAppError(erro)).toBe(true);
    expect((erro as AppError).code).toBe("validation");
    expect((erro as AppError).fieldErrors).toEqual({
      profissional: "Informe o profissional.",
    });
  });

  it("rejeita cliente em branco (apenas espaços) com AppError de validação", () => {
    const incompleto: AppointmentDTO = { ...AGENDAMENTO_VALIDO, cliente: "   " };

    let erro: unknown;
    try {
      buildCustomerMessage(incompleto, "confirmacao");
    } catch (capturado) {
      erro = capturado;
    }

    expect(isAppError(erro)).toBe(true);
    expect((erro as AppError).code).toBe("validation");
    expect((erro as AppError).fieldErrors).toEqual({
      cliente: "Informe o nome do cliente.",
    });
  });

  it("rejeita data ausente com AppError de validação, sem devolver mensagem", () => {
    const incompleto: AppointmentDTO = { ...AGENDAMENTO_VALIDO, data: "" };

    let erro: unknown;
    let mensagem: string | undefined;
    try {
      mensagem = buildCustomerMessage(incompleto, "confirmacao");
    } catch (capturado) {
      erro = capturado;
    }

    expect(mensagem).toBeUndefined();
    expect(isAppError(erro)).toBe(true);
    expect((erro as AppError).code).toBe("validation");
  });
});

describe("buildWhatsAppUrl", () => {
  it("CT-07: gera URL wa.me com o telefone e a mensagem codificada (encodeURIComponent)", () => {
    const url = buildWhatsAppUrl(AGENDAMENTO_VALIDO, "confirmacao");

    expect(url).toBe(
      `https://wa.me/11987654321?text=${encodeURIComponent(MENSAGEM_CONFIRMACAO)}`,
    );
  });

  it("CT-08: rejeita telefone ausente com AppError de validação, sem devolver URL", () => {
    const incompleto: AppointmentDTO = { ...AGENDAMENTO_VALIDO, telefone: "" };

    let erro: unknown;
    let url: string | undefined;
    try {
      url = buildWhatsAppUrl(incompleto, "confirmacao");
    } catch (capturado) {
      erro = capturado;
    }

    expect(url).toBeUndefined();
    expect(isAppError(erro)).toBe(true);
    expect((erro as AppError).code).toBe("validation");
    expect((erro as AppError).fieldErrors).toEqual({ telefone: "Telefone inválido." });
  });

  it("rejeita profissional ausente antes de exigir telefone (mensagem falha primeiro)", () => {
    const incompleto: AppointmentDTO = {
      ...AGENDAMENTO_VALIDO,
      profissional: "",
      telefone: "",
    };

    let erro: unknown;
    try {
      buildWhatsAppUrl(incompleto, "confirmacao");
    } catch (capturado) {
      erro = capturado;
    }

    expect(isAppError(erro)).toBe(true);
    expect((erro as AppError).fieldErrors).toEqual({
      profissional: "Informe o profissional.",
    });
  });
});
