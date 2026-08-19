import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ScheduleSlotGrid,
  type SaveAvailabilityAction,
} from "@/src/features/agenda/components/ScheduleSlotGrid";
import {
  toAvailabilitySlotDTO,
  type AvailabilitySlot,
  type AvailabilitySlotDTO,
  type AvailabilitySlotInput,
} from "@/src/features/agenda/types";
import { agendaTexts, dominioTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { actionFail, actionOk } from "@/src/shared/errors";

/**
 * Cobertura extra de T5 (além de CT-13, que fica em `SingleProfessionalSummary`):
 *
 * - Salvar os slots da data selecionada (§4 do T5.md: "Admin conseguir
 *   visualizar e salvar slots da data selecionada").
 * - Guarda contra editar slot ocupado como livre (§4: "Slots ocupados não
 *   forem editados como livres indevidamente").
 *
 * `statusVisual` de cada slot vem do DTO real (`toAvailabilitySlotDTO`, T2),
 * nunca escrito à mão — a derivação de status não é reimplementada aqui, nem
 * no componente sob teste.
 */

/** Antes de todos os horários usados nos testes: nenhum vira "inativo". */
const AGORA = new Date("2026-08-14T21:00:00.000Z");
const ISO_DATE = "2026-08-15";

function buildSlot(overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot {
  return {
    data: ISO_DATE,
    horario: "09:00",
    liberado: true,
    agendamentoId: null,
    ...overrides,
  };
}

function renderGrid(
  slots: AvailabilitySlotDTO[],
  saveAction: SaveAvailabilityAction = vi.fn(async () => actionOk<AvailabilitySlotDTO[]>([])),
) {
  render(<ScheduleSlotGrid isoDate={ISO_DATE} slots={slots} saveAction={saveAction} />);
  return { saveAction };
}

describe("ScheduleSlotGrid", () => {
  it("renderiza os slots com horário e status vindos do DTO", () => {
    const disponivel = toAvailabilitySlotDTO(buildSlot({ horario: "09:00" }), AGORA);
    const bloqueado = toAvailabilitySlotDTO(
      buildSlot({ horario: "09:30", liberado: false }),
      AGORA,
    );
    const ocupado = toAvailabilitySlotDTO(
      buildSlot({ horario: "10:00", agendamentoId: "agd-1" }),
      AGORA,
    );

    renderGrid([disponivel, bloqueado, ocupado]);

    expect(
      screen.getByRole("checkbox", { name: `${agendaTexts.liberadoLabel} 09:00` }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: `${agendaTexts.liberadoLabel} 09:30` }),
    ).not.toBeChecked();
    expect(screen.getByText(agendaTexts.statusDisponivel)).toBeInTheDocument();
    expect(screen.getByText(agendaTexts.statusBloqueado)).toBeInTheDocument();
    expect(screen.getByText(agendaTexts.statusOcupado)).toBeInTheDocument();
  });

  it("não permite desmarcar um slot ocupado e sempre envia liberado=true por ele ao salvar", async () => {
    const ocupado = toAvailabilitySlotDTO(
      buildSlot({ horario: "10:00", agendamentoId: "agd-1" }),
      AGORA,
    );
    const { saveAction } = renderGrid([ocupado]);

    const checkboxOcupado = screen.getByRole("checkbox", {
      name: `${agendaTexts.liberadoLabel} 10:00`,
    });
    expect(checkboxOcupado).toBeDisabled();
    expect(checkboxOcupado).toBeChecked();

    // Clicar num checkbox desabilitado não dispara `onChange` — o estado
    // continua marcado como estava.
    fireEvent.click(checkboxOcupado);
    expect(checkboxOcupado).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith(ISO_DATE, [
      { horario: "10:00", liberado: true },
    ] satisfies AvailabilitySlotInput[]);
  });

  it("-> (negative companion) alterna um slot livre e envia o novo valor ao salvar", async () => {
    const bloqueado = toAvailabilitySlotDTO(
      buildSlot({ horario: "09:00", liberado: false }),
      AGORA,
    );
    const { saveAction } = renderGrid([bloqueado]);

    fireEvent.click(
      screen.getByRole("checkbox", { name: `${agendaTexts.liberadoLabel} 09:00` }),
    );
    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith(ISO_DATE, [
      { horario: "09:00", liberado: true },
    ] satisfies AvailabilitySlotInput[]);
  });

  it("adiciona um novo horário e o inclui no salvamento", async () => {
    const { saveAction } = renderGrid([]);

    const novoHorario = screen.getByLabelText(agendaTexts.novoHorarioLabel);
    expect(novoHorario).toHaveAttribute("type", "text");
    expect(novoHorario).toHaveAttribute("placeholder", "HH:mm");
    expect(novoHorario).toHaveAttribute("pattern", "[0-9]{2}:[0-9]{2}");

    fireEvent.change(novoHorario, { target: { value: "10:30" } });
    fireEvent.click(screen.getByRole("button", { name: feedbackTexts.acaoAdicionarHorario }));

    expect(
      screen.getByRole("checkbox", { name: `${agendaTexts.liberadoLabel} 10:30` }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith(ISO_DATE, [
      { horario: "10:30", liberado: true },
    ] satisfies AvailabilitySlotInput[]);
  });

  it("mascara quatro dígitos como HH:mm e salva o valor formatado", async () => {
    const { saveAction } = renderGrid([]);

    const novoHorario = screen.getByLabelText(agendaTexts.novoHorarioLabel);
    fireEvent.change(novoHorario, { target: { value: "1630" } });

    expect(novoHorario).toHaveValue("16:30");

    fireEvent.click(screen.getByRole("button", { name: feedbackTexts.acaoAdicionarHorario }));

    expect(
      screen.getByRole("checkbox", { name: `${agendaTexts.liberadoLabel} 16:30` }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith(ISO_DATE, [
      { horario: "16:30", liberado: true },
    ] satisfies AvailabilitySlotInput[]);
  });

  it("normaliza horário digitado para o formato 24 horas antes de salvar", async () => {
    const { saveAction } = renderGrid([]);

    fireEvent.change(screen.getByLabelText(agendaTexts.novoHorarioLabel), {
      target: { value: "9:5" },
    });
    fireEvent.click(screen.getByRole("button", { name: feedbackTexts.acaoAdicionarHorario }));

    expect(
      screen.getByRole("checkbox", { name: `${agendaTexts.liberadoLabel} 09:05` }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith(ISO_DATE, [
      { horario: "09:05", liberado: true },
    ] satisfies AvailabilitySlotInput[]);
  });

  it("-> (negative companion) rejeita horário repetido sem duplicar a linha", () => {
    const existente = toAvailabilitySlotDTO(buildSlot({ horario: "09:00" }), AGORA);
    renderGrid([existente]);

    fireEvent.change(screen.getByLabelText(agendaTexts.novoHorarioLabel), {
      target: { value: "09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: feedbackTexts.acaoAdicionarHorario }));

    expect(screen.getByText(dominioTexts.horarioRepetido)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("-> (negative companion) rejeita horário vazio sem criar novo slot", () => {
    renderGrid([]);

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: feedbackTexts.acaoAdicionarHorario }));

    expect(screen.getByText(dominioTexts.horarioInvalido)).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("exibe o toast de sucesso após salvar", async () => {
    const slot = toAvailabilitySlotDTO(buildSlot({ horario: "09:00" }), AGORA);
    const saveAction: SaveAvailabilityAction = vi.fn(async () =>
      actionOk<AvailabilitySlotDTO[]>([slot]),
    );
    renderGrid([slot], saveAction);

    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    await waitFor(() =>
      expect(screen.getByText(feedbackTexts.disponibilidadeSalva)).toBeInTheDocument(),
    );
  });

  it("-> (negative companion) exibe a mensagem de erro específica quando o salvamento falha", async () => {
    const slot = toAvailabilitySlotDTO(
      buildSlot({ horario: "10:00", agendamentoId: "agd-1" }),
      AGORA,
    );
    const saveAction: SaveAvailabilityAction = vi.fn(async () =>
      actionFail<AvailabilitySlotDTO[]>("conflict", dominioTexts.horarioOcupadoNaoBloqueavel),
    );
    renderGrid([slot], saveAction);

    fireEvent.click(screen.getByRole("button", { name: agendaTexts.salvarAcao }));

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(dominioTexts.horarioOcupadoNaoBloqueavel);
    expect(screen.queryByText(feedbackTexts.disponibilidadeSalva)).toBeNull();
  });

  it("exibe o estado vazio e mantém a ação de adicionar horário disponível", () => {
    renderGrid([]);

    expect(screen.getByText(feedbackTexts.dataSemHorarios)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: feedbackTexts.acaoAdicionarHorario }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});
