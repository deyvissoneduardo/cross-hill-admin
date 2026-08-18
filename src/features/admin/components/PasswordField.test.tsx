import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordField } from "./PasswordField";

describe("PasswordField", () => {
  it("permite mostrar e esconder a senha", () => {
    render(<PasswordField id="admin-senha" name="senha" label="Senha" />);

    const input = screen.getByLabelText("Senha");
    const toggle = screen.getByRole("button", { name: "Mostrar senha" });

    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Esconder senha" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Esconder senha" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
