import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppointmentListSkeleton } from "@/src/features/agendamentos/components/AppointmentListSkeleton";
import { APPOINTMENT_GRID_CLASS } from "@/src/features/agendamentos/components/appointmentListLayout";
import { agendamentoTexts } from "@/src/shared/constants/texts";

/**
 * Estado de Loading do dashboard (`design.md` §5): "Skeleton de 3 cards".
 *
 * O que se afirma é o que fica visível/anunciado — a região de carga, a
 * quantidade de cards reservados e o grid compartilhado com a listagem real —,
 * não como o fallback é ligado ao `<Suspense>` (isso é decisão de composição de
 * `app/admin/page.tsx`).
 */
describe("AppointmentListSkeleton — estado de carregamento do painel", () => {
  it("anuncia o carregamento em uma única região de status", () => {
    render(<AppointmentListSkeleton />);

    expect(
      screen.getByRole("status", { name: agendamentoTexts.painelCarregando }),
    ).toBeInTheDocument();
  });

  it("reserva três cards enquanto os agendamentos não chegam", () => {
    render(<AppointmentListSkeleton />);

    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(3);
  });

  it("reserva as colunas no mesmo grid usado pela listagem real", () => {
    render(<AppointmentListSkeleton />);

    // Impede o drift que a cópia literal das classes permitia: o esqueleto e a
    // listagem passam a mudar de colunas juntos, pela mesma constante.
    expect(
      screen.getByRole("status", { name: agendamentoTexts.painelCarregando }),
    ).toHaveClass(...APPOINTMENT_GRID_CLASS.split(" "));
  });
});
