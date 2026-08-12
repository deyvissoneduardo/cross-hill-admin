import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppointmentList } from "@/src/features/agendamentos/components/AppointmentList";
import {
  toAppointmentDTO,
  type Appointment,
  type AppointmentDTO,
} from "@/src/features/agendamentos/types";
import { agendamentoTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { actionOk } from "@/src/shared/errors";

/**
 * CT-01, CT-02 — listagem principal do painel (`design.md` §4.2).
 *
 * Invariantes:
 * - CT-01: agendamento ativo vira card com cliente, telefone, profissional,
 *   data, horário e status.
 * - CT-02: agendamento cancelado nunca aparece na listagem principal.
 *
 * O DTO é construído pelo caminho público de produção (`toAppointmentDTO` com
 * `now` injetado), nunca escrito à mão: o status exibido é derivado, e um DTO
 * literal deixaria a derivação fora do teste.
 */

/**
 * Relógio fixo da suíte: `2026-08-14 18:00` na operação (`-03:00`).
 *
 * Fica ANTES do atendimento de `2026-08-15 09:00` (`2026-08-15T12:00:00Z`) e
 * DEPOIS do de `2026-08-10 08:00` (`2026-08-10T11:00:00Z`) — é o que separa o
 * agendamento que segue aguardando daquele que já pode exibir `confirmado`.
 */
const AGORA = new Date("2026-08-14T21:00:00.000Z");

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "agd-1",
    cliente: "João Pereira",
    telefone: "5511988887777",
    profissional: "Ana Souza",
    data: "2026-08-15",
    horario: "09:00",
    status: "aguardando_agendamento",
    adminConfirmadoEm: null,
    profissionalConfirmadoEm: null,
    canceladoEm: null,
    ...overrides,
  };
}

function renderList(agendamentos: AppointmentDTO[]) {
  render(
    <AppointmentList
      agendamentos={agendamentos}
      confirmAction={vi.fn()}
      cancelAction={vi.fn()}
    />,
  );
}

describe("AppointmentList", () => {
  it("CT-01: renderiza cards com dados essenciais para aguardando e confirmados", () => {
    const aguardando = toAppointmentDTO(buildAppointment(), AGORA);
    const confirmado = toAppointmentDTO(
      buildAppointment({
        id: "agd-2",
        cliente: "Marina Alves",
        telefone: "5511977776666",
        profissional: "Ana Souza",
        data: "2026-08-10",
        horario: "08:00",
        adminConfirmadoEm: "2026-08-09T14:00:00.000Z",
        profissionalConfirmadoEm: "2026-08-09T15:00:00.000Z",
      }),
      AGORA,
    );

    renderList([aguardando, confirmado]);

    const cardAguardando = screen.getByRole("article", { name: "João Pereira" });
    expect(within(cardAguardando).getByText("5511988887777")).toBeInTheDocument();
    expect(
      within(cardAguardando).getByText(
        `${agendamentoTexts.profissionalRotulo}: Ana Souza`,
      ),
    ).toBeInTheDocument();
    expect(within(cardAguardando).getByText("15/08 · 09:00")).toHaveAttribute(
      "datetime",
      "2026-08-15T09:00",
    );
    expect(
      within(cardAguardando).getByText(agendamentoTexts.statusAguardando),
    ).toBeInTheDocument();

    const cardConfirmado = screen.getByRole("article", { name: "Marina Alves" });
    expect(within(cardConfirmado).getByText("5511977776666")).toBeInTheDocument();
    expect(
      within(cardConfirmado).getByText(
        `${agendamentoTexts.profissionalRotulo}: Ana Souza`,
      ),
    ).toBeInTheDocument();
    expect(within(cardConfirmado).getByText("10/08 · 08:00")).toHaveAttribute(
      "datetime",
      "2026-08-10T08:00",
    );
    expect(
      within(cardConfirmado).getByText(agendamentoTexts.statusConfirmado),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("CT-02: não renderiza cards com status cancelado", () => {
    const ativo = toAppointmentDTO(buildAppointment(), AGORA);
    const cancelado = toAppointmentDTO(
      buildAppointment({
        id: "agd-cancelado",
        cliente: "Rita Nunes",
        status: "cancelado",
        canceladoEm: "2026-08-13T18:00:00.000Z",
      }),
      AGORA,
    );

    renderList([cancelado, ativo]);

    expect(screen.queryByRole("article", { name: "Rita Nunes" })).toBeNull();
    expect(screen.queryByText(agendamentoTexts.statusCancelado)).toBeNull();
    expect(screen.getByRole("article", { name: "João Pereira" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("exibe o estado vazio com a ação de recuperação quando não há ativos", () => {
    const cancelado = toAppointmentDTO(
      buildAppointment({
        id: "agd-cancelado",
        cliente: "Rita Nunes",
        status: "cancelado",
        canceladoEm: "2026-08-13T18:00:00.000Z",
      }),
      AGORA,
    );

    render(
      <AppointmentList
        agendamentos={[cancelado]}
        confirmAction={vi.fn()}
        cancelAction={vi.fn()}
        emptyAction={<button type="button">{feedbackTexts.acaoAtualizar}</button>}
      />,
    );

    expect(screen.getByText(feedbackTexts.listaVaziaAgendamentos)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: feedbackTexts.acaoAtualizar }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("disponibiliza a mensagem e a conversa com o cliente após a confirmação", async () => {
    const aguardando = toAppointmentDTO(buildAppointment(), AGORA);
    const confirmado: AppointmentDTO = {
      ...aguardando,
      adminConfirmadoEm: "2026-08-14T17:32:00.000Z",
      confirmadoPrimeiroPor: "admin",
    };
    const confirmAction = vi.fn(async () => actionOk(confirmado));

    render(
      <AppointmentList
        agendamentos={[aguardando]}
        confirmAction={confirmAction}
        cancelAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: agendamentoTexts.confirmarAcao }));
    fireEvent.click(
      screen.getByRole("button", { name: agendamentoTexts.confirmarDialogAcao }),
    );

    const comunicacao = await screen.findByRole("region", {
      name: agendamentoTexts.comunicacaoTitulo,
    });

    const mensagem =
      "Olá, João Pereira! Seu agendamento com Ana Souza em 15/08/2026 às 09:00 foi confirmado.";
    expect(within(comunicacao).getByText(mensagem)).toBeInTheDocument();
    expect(
      within(comunicacao).getByRole("link", {
        name: agendamentoTexts.comunicacaoAbrirConversa,
      }),
    ).toHaveAttribute(
      "href",
      `https://wa.me/5511988887777?text=${encodeURIComponent(mensagem)}`,
    );

    await waitFor(() =>
      expect(screen.getByText(agendamentoTexts.acaoConcluida)).toBeInTheDocument(),
    );
  });
});
