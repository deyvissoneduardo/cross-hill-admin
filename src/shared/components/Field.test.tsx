import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Field } from "@/src/shared/components/Field";

describe("Field", () => {
  it("associa o label ao controle e mantém o campo válido sem erro", () => {
    render(<Field id="admin-email" name="email" type="email" label="E-mail" />);

    const input = screen.getByLabelText("E-mail");

    expect(input).toHaveAttribute("id", "admin-email");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("descreve o campo pelo texto auxiliar quando não há erro", () => {
    render(
      <Field id="admin-email" name="email" label="E-mail" hint="Use o e-mail cadastrado." />,
    );

    const input = screen.getByLabelText("E-mail");

    expect(input).toHaveAttribute("aria-describedby", "admin-email-ajuda");
    expect(screen.getByText("Use o e-mail cadastrado.")).toHaveAttribute(
      "id",
      "admin-email-ajuda",
    );
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marca o campo inválido e o associa à mensagem de erro", () => {
    render(
      <Field
        id="admin-senha"
        name="senha"
        type="password"
        label="Senha"
        hint="Mínimo de 8 caracteres."
        error="Informe a senha."
      />,
    );

    const input = screen.getByLabelText("Senha");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "admin-senha-erro");
    expect(screen.getByText("Informe a senha.")).toHaveAttribute("id", "admin-senha-erro");
    // Com erro, o texto auxiliar dá lugar à mensagem — só uma descrição por vez.
    expect(screen.queryByText("Mínimo de 8 caracteres.")).toBeNull();
  });
});
