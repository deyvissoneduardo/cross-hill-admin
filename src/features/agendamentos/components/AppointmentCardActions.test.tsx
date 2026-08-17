import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppointmentCard } from "@/src/features/agendamentos/components/AppointmentCard";
import {
  toAppointmentDTO,
  type Appointment,
  type AppointmentDTO,
} from "@/src/features/agendamentos/types";
import { agendamentoTexts } from "@/src/shared/constants/texts";
import { actionOk, type ActionResult } from "@/src/shared/errors";

/**
 * CT-03, CT-04, CT-19, CT-20 — ações e confirmações do card operacional.
 *
 * Invariantes:
 * - CT-03: a confirmação administrativa só é registrada depois de uma
 *   confirmação explícita no dialog.
 * - CT-04: agendamento já confirmado comunica a condição e não oferece nova
 *   confirmação.
 * - CT-19: com as duas partes confirmadas antes do horário, o card mostra as
 *   duas confirmações, quem confirmou primeiro e MANTÉM `aguardando agendamento`.
 * - CT-20: com apenas uma parte confirmada, a outra aparece como pendente.
 *
 * O relógio é entrada explícita (`toAppointmentDTO(appointment, now)`), que é a
 * injeção de data já estabelecida no projeto — nunca `Date.now()` implícito.
 */

/**
 * Relógio fixo da suíte: `2026-08-14 18:00` na operação (`-03:00`).
 *
 * Fica ANTES do atendimento padrão de `2026-08-15 09:00` (`2026-08-15T12:00Z`)
 * — é a pré-condição de CT-19/CT-20 — e DEPOIS do atendimento de
 * `2026-08-10 08:00` usado no card já confirmado de CT-04.
 */
const AGORA = new Date("2026-08-14T21:00:00.000Z");

/** `2026-08-14T17:32:00Z` = `14:32` na operação (`design.md` §4.2). */
const ADMIN_CONFIRMOU_EM = "2026-08-14T17:32:00.000Z";
/** 33 minutos depois do administrador — o profissional NÃO é o primeiro. */
const PROFISSIONAL_CONFIRMOU_EM = "2026-08-14T18:05:00.000Z";

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

function buildDTO(overrides: Partial<Appointment> = {}): AppointmentDTO {
  return toAppointmentDTO(buildAppointment(overrides), AGORA);
}

describe("AppointmentCard — confirmação administrativa", () => {
  it("CT-03: abre dialog antes de executar a confirmação administrativa", async () => {
    const agendamento = buildDTO();
    const confirmAction = vi.fn(async () => actionOk(agendamento));
    const cancelAction = vi.fn(async () => actionOk(agendamento));
    const popup = {
      opener: window,
      location: { href: "" },
      close: vi.fn(),
    };
    vi.mocked(window.open).mockReturnValue(popup as unknown as Window);

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={confirmAction}
        cancelAction={cancelAction}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: agendamentoTexts.confirmarAcao }));

    const dialog = screen.getByRole("dialog", {
      name: agendamentoTexts.confirmarDialogTitulo,
    });
    expect(
      within(dialog).getByText(agendamentoTexts.confirmarDialogConsequencia),
    ).toBeInTheDocument();
    // O clique no card abre o dialog e NADA mais: a mutação ainda não rodou.
    expect(confirmAction).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: agendamentoTexts.confirmarDialogAcao,
      }),
    );

    await waitFor(() => expect(confirmAction).toHaveBeenCalledTimes(1));
    expect(confirmAction).toHaveBeenCalledWith("agd-1");
    expect(cancelAction).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(popup.opener).toBeNull();
    expect(popup.location.href).toMatch(/^https:\/\/wa\.me\/5511988887777\?text=/);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("CT-04: bloqueia nova confirmação quando o status já está confirmado", () => {
    const agendamento = buildDTO({
      data: "2026-08-10",
      horario: "08:00",
      adminConfirmadoEm: "2026-08-09T14:00:00.000Z",
      profissionalConfirmadoEm: "2026-08-09T15:00:00.000Z",
    });
    const confirmAction = vi.fn(async () => actionOk(agendamento));

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={confirmAction}
        cancelAction={vi.fn()}
      />,
    );

    expect(screen.getByText(agendamentoTexts.statusConfirmado)).toBeInTheDocument();

    const confirmar = screen.getByRole("button", {
      name: agendamentoTexts.confirmarAcao,
    });
    expect(confirmar).toBeDisabled();

    fireEvent.click(confirmar);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it("CT-19: exibe as duas confirmações, o primeiro confirmador e mantém o status aguardando", () => {
    const agendamento = buildDTO({
      adminConfirmadoEm: ADMIN_CONFIRMOU_EM,
      profissionalConfirmadoEm: PROFISSIONAL_CONFIRMOU_EM,
    });

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={vi.fn()}
        cancelAction={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Administrador: confirmado em 14/08/2026 às 14:32"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Profissional: confirmado em 14/08/2026 às 15:05"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `${agendamentoTexts.primeiroConfirmadorRotulo}: ${agendamentoTexts.primeiroConfirmadorAdmin}`,
      ),
    ).toBeInTheDocument();

    // CA-15: as duas confirmações NÃO antecipam o status antes do horário.
    expect(screen.getByText(agendamentoTexts.statusAguardando)).toBeInTheDocument();
    expect(screen.queryByText(agendamentoTexts.statusConfirmado)).toBeNull();
  });

  it("CT-20: exibe a parte pendente quando apenas o administrador confirmou", () => {
    const agendamento = buildDTO({ adminConfirmadoEm: ADMIN_CONFIRMOU_EM });

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={vi.fn()}
        cancelAction={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Administrador: confirmado em 14/08/2026 às 14:32"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `${agendamentoTexts.confirmacaoProfissional}: ${agendamentoTexts.confirmacaoPendente}`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Profissional: confirmado/)).toBeNull();

    expect(screen.getByText(agendamentoTexts.statusAguardando)).toBeInTheDocument();
    expect(screen.queryByText(agendamentoTexts.statusConfirmado)).toBeNull();
  });
});

describe("AppointmentCard — carregamento local durante a ação", () => {
  it("troca confirmações e ações por um skeleton anunciado enquanto a action está em voo", async () => {
    const agendamento = buildDTO({ adminConfirmadoEm: ADMIN_CONFIRMOU_EM });
    const popup = {
      opener: window as Window | null,
      location: { href: "" },
      close: vi.fn(),
    };
    vi.mocked(window.open).mockReturnValue(popup as unknown as Window);

    // A action fica pendurada de propósito: é o intervalo em que o card está
    // "atualizando após ação" (`design.md` §5).
    let concluir: (resultado: ActionResult<AppointmentDTO>) => void = () => {};
    const cancelAction = vi.fn(
      () =>
        new Promise<ActionResult<AppointmentDTO>>((resolve) => {
          concluir = resolve;
        }),
    );

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={vi.fn()}
        cancelAction={cancelAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: agendamentoTexts.cancelarAcao }));
    fireEvent.click(
      screen.getByRole("button", { name: agendamentoTexts.cancelarDialogAcao }),
    );

    expect(
      await screen.findByRole("status", { name: agendamentoTexts.cardAtualizando }),
    ).toBeInTheDocument();
    // Nada do que a ação invalida continua na tela: nem a confirmação anterior,
    // nem os botões que dispararIAM uma segunda mutação.
    expect(screen.queryByText(/^Administrador: confirmado/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: agendamentoTexts.cancelarAcao }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: agendamentoTexts.confirmarAcao }),
    ).toBeNull();

    concluir(actionOk(agendamento));

    // Concluída a ação, o card volta ao conteúdo real — o skeleton não fica preso.
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: agendamentoTexts.cardAtualizando }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("button", { name: agendamentoTexts.cancelarAcao }),
    ).toBeInTheDocument();
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(popup.opener).toBeNull();
    expect(popup.location.href).toMatch(/^https:\/\/wa\.me\/5511988887777\?text=/);
    expect(decodeURIComponent(popup.location.href)).toContain("foi cancelado.");
  });
});

describe("AppointmentCard — falha de ação", () => {
  it("mantém o dialog aberto com o erro recuperável quando a action falha", async () => {
    const agendamento = buildDTO();
    const cancelAction = vi.fn(async () => ({
      ok: false as const,
      code: "unavailable" as const,
      message: "Serviço indisponível. Tente novamente.",
    }));

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={vi.fn()}
        cancelAction={cancelAction}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: agendamentoTexts.cancelarAcao }));
    fireEvent.click(
      screen.getByRole("button", { name: agendamentoTexts.cancelarDialogAcao }),
    );

    await waitFor(() => expect(cancelAction).toHaveBeenCalledTimes(1));

    const dialog = screen.getByRole("dialog", {
      name: agendamentoTexts.cancelarDialogTitulo,
    });
    expect(
      within(dialog).getByText("Serviço indisponível. Tente novamente."),
    ).toBeInTheDocument();
  });

  it("oferece apenas o reconhecimento quando a confirmação é duplicada", async () => {
    const agendamento = buildDTO();
    const confirmAction = vi.fn(async () => ({
      ok: false as const,
      code: "conflict" as const,
      message: "Este agendamento já foi confirmado.",
    }));

    render(
      <AppointmentCard
        agendamento={agendamento}
        confirmAction={confirmAction}
        cancelAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: agendamentoTexts.confirmarAcao }));
    fireEvent.click(
      screen.getByRole("button", { name: agendamentoTexts.confirmarDialogAcao }),
    );

    await waitFor(() => expect(confirmAction).toHaveBeenCalledTimes(1));

    const dialog = screen.getByRole("dialog", {
      name: agendamentoTexts.confirmarDialogTitulo,
    });
    expect(
      within(dialog).getByText("Este agendamento já foi confirmado."),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", {
        name: agendamentoTexts.confirmarDialogAcao,
      }),
    ).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Entendi" })).toBeInTheDocument();
    expect(confirmAction).toHaveBeenCalledTimes(1);
  });
});
