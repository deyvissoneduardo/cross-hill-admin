import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateSelectorForm } from "@/src/features/agenda/components/DateSelectorForm";
import { agendaTexts } from "@/src/shared/constants/texts";

describe("DateSelectorForm", () => {
  it("submete automaticamente a mesma navegação GET ao mudar a data", () => {
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => undefined);

    render(<DateSelectorForm isoDate="2026-08-17" />);

    const calendario = screen.getByLabelText(agendaTexts.seletorDataLabel);
    fireEvent.change(calendario, { target: { value: "2026-08-18" } });

    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(calendario).toHaveValue("2026-08-18");
    expect(screen.queryByRole("button", { name: agendaTexts.seletorDataAcao })).toBeNull();
  });
});
