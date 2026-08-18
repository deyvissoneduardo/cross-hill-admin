import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EditAppointmentDialog } from "./EditAppointmentDialog";

const AGENDAMENTO = {
  id: "agd-1",
  cliente: "Maria Silva",
  telefone: "11999998888",
  profissional: "Ana Souza",
  data: "2026-08-20",
  horario: "09:00",
  status: "aguardando_agendamento" as const,
  adminConfirmadoEm: null,
  profissionalConfirmadoEm: null,
  confirmadoPrimeiroPor: null,
  canceladoEm: null,
};

describe("EditAppointmentDialog", () => {
  it("oferece somente os slots disponíveis retornados e salva o escolhido", async () => {
    const listAvailableAction = vi.fn(async () => ({
      ok: true as const,
      data: [
        {
          id: "2026-08-21T10:00",
          data: "2026-08-21",
          horario: "10:00",
          liberado: true,
          ocupado: false,
          statusVisual: "disponivel" as const,
        },
      ],
    }));
    const rescheduleAction = vi.fn(async () => ({
      ok: true as const,
      data: { ...AGENDAMENTO, data: "2026-08-21", horario: "10:00" },
    }));
    const onSuccess = vi.fn();

    render(
      <EditAppointmentDialog
        open
        agendamento={AGENDAMENTO}
        listAvailableAction={listAvailableAction}
        rescheduleAction={rescheduleAction}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    );

    await waitFor(() => expect(listAvailableAction).toHaveBeenCalledWith("2026-08-20"));

    fireEvent.change(screen.getByLabelText("Nova data"), {
      target: { value: "2026-08-21" },
    });
    await waitFor(() => expect(listAvailableAction).toHaveBeenCalledWith("2026-08-21"));
    await waitFor(() => expect(screen.getByRole("option", { name: "10:00" })).toBeVisible());

    fireEvent.change(screen.getByLabelText("Novo horário"), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alteração" }));

    await waitFor(() =>
      expect(rescheduleAction).toHaveBeenCalledWith("agd-1", "2026-08-21", "10:00"),
    );
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ data: "2026-08-21", horario: "10:00" }),
    );
  });
});
