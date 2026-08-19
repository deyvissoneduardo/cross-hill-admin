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
 * - CT-01: agendamento ativo vira card com cliente, telefone,
 *   data, horário e status.
 * - CT-02: agendamento cancelado permanece visível com seu status.
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
      within(cardAguardando).queryByText(
        `${agendamentoTexts.profissionalRotulo}: Ana Souza`,
      ),
    ).toBeNull();
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
      within(cardConfirmado).queryByText(
        `${agendamentoTexts.profissionalRotulo}: Ana Souza`,
      ),
    ).toBeNull();
    expect(within(cardConfirmado).getByText("10/08 · 08:00")).toHaveAttribute(
      "datetime",
      "2026-08-10T08:00",
    );
    expect(
      within(cardConfirmado).getByText(agendamentoTexts.statusConfirmado),
    ).toBeInTheDocument();

    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("CT-02: mantém o card cancelado visível e sem ações de mutação", () => {
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

    const cardCancelado = screen.getByRole("article", { name: "Rita Nunes" });
    expect(within(cardCancelado).getByText(agendamentoTexts.statusCancelado)).toBeVisible();
    expect(cardCancelado).toHaveClass("w-full");
    expect(cardCancelado).toHaveClass("min-h-48");
    expect(
      within(cardCancelado).queryByRole("button", { name: agendamentoTexts.cancelarAcao }),
    ).toBeNull();
    expect(screen.getByRole("article", { name: "João Pereira" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("filtra os cards por dia e pela semana de segunda a domingo", () => {
    const domingo = toAppointmentDTO(
      buildAppointment({ id: "domingo", cliente: "Cliente Domingo", data: "2026-08-16" }),
      AGORA,
    );
    const segunda = toAppointmentDTO(
      buildAppointment({ id: "segunda", cliente: "Cliente Segunda", data: "2026-08-17" }),
      AGORA,
    );
    const sexta = toAppointmentDTO(
      buildAppointment({ id: "sexta", cliente: "Cliente Sexta", data: "2026-08-21" }),
      AGORA,
    );
    const proximaSegunda = toAppointmentDTO(
      buildAppointment({
        id: "proxima-segunda",
        cliente: "Cliente Próxima Semana",
        data: "2026-08-24",
      }),
      AGORA,
    );

    renderList([domingo, segunda, sexta, proximaSegunda]);

    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroPeriodoLabel), {
      target: { value: "dia" },
    });
    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroDataLabel), {
      target: { value: "2026-08-21" },
    });
    expect(screen.getByRole("article", { name: "Cliente Sexta" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Cliente Segunda" })).toBeNull();

    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroPeriodoLabel), {
      target: { value: "semana" },
    });
    expect(screen.getByRole("article", { name: "Cliente Segunda" })).toBeVisible();
    expect(screen.getByRole("article", { name: "Cliente Sexta" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Cliente Domingo" })).toBeNull();
    expect(
      screen.queryByRole("article", { name: "Cliente Próxima Semana" }),
    ).toBeNull();
  });

  it("filtra os cards por status", () => {
    const aguardando = toAppointmentDTO(buildAppointment(), AGORA);
    const confirmado = toAppointmentDTO(
      buildAppointment({
        id: "agd-confirmado",
        cliente: "Marina Alves",
        data: "2026-08-10",
        horario: "08:00",
        adminConfirmadoEm: "2026-08-09T14:00:00.000Z",
        profissionalConfirmadoEm: "2026-08-09T15:00:00.000Z",
      }),
      AGORA,
    );
    const cancelado = toAppointmentDTO(
      buildAppointment({
        id: "agd-cancelado",
        cliente: "Rita Nunes",
        status: "cancelado",
        canceladoEm: "2026-08-13T18:00:00.000Z",
      }),
      AGORA,
    );

    renderList([aguardando, confirmado, cancelado]);

    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroStatusLabel), {
      target: { value: "cancelado" },
    });

    expect(screen.getByRole("article", { name: "Rita Nunes" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "João Pereira" })).toBeNull();
    expect(screen.queryByRole("article", { name: "Marina Alves" })).toBeNull();

    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroStatusLabel), {
      target: { value: "aguardando_agendamento" },
    });

    expect(screen.getByRole("article", { name: "João Pereira" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Rita Nunes" })).toBeNull();
  });

  it("combina filtro de semana com filtro de status", () => {
    const aguardandoNaSemana = toAppointmentDTO(
      buildAppointment({
        id: "agd-semana-aguardando",
        cliente: "Cliente Semana",
        data: "2026-08-21",
      }),
      AGORA,
    );
    const canceladoNaSemana = toAppointmentDTO(
      buildAppointment({
        id: "agd-semana-cancelado",
        cliente: "Cancelado Semana",
        data: "2026-08-21",
        status: "cancelado",
        canceladoEm: "2026-08-13T18:00:00.000Z",
      }),
      AGORA,
    );
    const canceladoForaDaSemana = toAppointmentDTO(
      buildAppointment({
        id: "agd-outra-semana-cancelado",
        cliente: "Cancelado Outra Semana",
        data: "2026-08-24",
        status: "cancelado",
        canceladoEm: "2026-08-13T18:00:00.000Z",
      }),
      AGORA,
    );

    renderList([aguardandoNaSemana, canceladoNaSemana, canceladoForaDaSemana]);

    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroPeriodoLabel), {
      target: { value: "semana" },
    });
    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroDataLabel), {
      target: { value: "2026-08-21" },
    });
    fireEvent.change(screen.getByLabelText(agendamentoTexts.filtroStatusLabel), {
      target: { value: "cancelado" },
    });

    expect(screen.getByRole("article", { name: "Cancelado Semana" })).toBeVisible();
    expect(screen.queryByRole("article", { name: "Cliente Semana" })).toBeNull();
    expect(
      screen.queryByRole("article", { name: "Cancelado Outra Semana" }),
    ).toBeNull();
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

    expect(screen.getByRole("article", { name: "Rita Nunes" })).toBeVisible();
    expect(screen.queryByText(feedbackTexts.listaVaziaAgendamentos)).toBeNull();
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

    const mensagem =
      "Olá, João Pereira! Seu agendamento com Ana Souza em 15/08/2026 às 09:00 foi confirmado.";
    const card = screen.getByRole("article", { name: "João Pereira" });
    const conversa = await within(card).findByRole("link", {
        name: agendamentoTexts.comunicacaoAbrirConversa,
      });
    expect(conversa).toHaveAttribute(
      "href",
      `https://wa.me/5511988887777?text=${encodeURIComponent(mensagem)}`,
    );
    expect(conversa).toHaveClass("w-full");
    expect(screen.queryByRole("region", { name: agendamentoTexts.comunicacaoTitulo })).toBeNull();

    await waitFor(() =>
      expect(screen.getByText(agendamentoTexts.acaoConcluida)).toBeInTheDocument(),
    );
  });
});
