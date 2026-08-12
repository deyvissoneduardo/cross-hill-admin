import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SingleProfessionalSummary } from "@/src/features/agenda/components/SingleProfessionalSummary";
import { agendaTexts } from "@/src/shared/constants/texts";

/**
 * CT-13 — profissional único somente-leitura na Agenda (`design.md` §4.3, PRD
 * CA-10).
 *
 * INVARIANT: a Agenda usa o profissional configurado e não oferece nenhuma
 * ação de CRUD (criar/editar/excluir) de profissional.
 * OWNING_LAYER: `component` — `SingleProfessionalSummary` é o único lugar da
 * Agenda que exibe o profissional.
 * REAL EXECUTION BOUNDARY: `none` — componente de apresentação puro; a leitura
 * real da configuração é `professionalSummary.test.ts` (unit) e a ausência de
 * rota/action de CRUD na superfície HTTP fica para CT-14 (T8, fora de escopo).
 * Setup (caminho legítimo): `professional` chega como prop pública do
 * componente — a mesma forma como `AgendaPage` o preenche em produção.
 */

describe("SingleProfessionalSummary", () => {
  it("CT-13: mostra o profissional configurado e não renderiza ações de CRUD (CA-10)", () => {
    render(<SingleProfessionalSummary professional="Profissional CrossHill" />);

    expect(screen.getByText("Profissional CrossHill")).toBeInTheDocument();
    // Nenhum botão/link existe no componente — logo nenhuma ação de
    // criar/editar/excluir profissional pode estar entre eles.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("-> CT-13 (negative companion): sem profissional configurado, mostra o texto de ausência e não o nome", () => {
    render(<SingleProfessionalSummary professional={null} />);

    expect(screen.getByText(agendaTexts.profissionalNaoConfigurado)).toBeInTheDocument();
    expect(screen.queryByText("Profissional CrossHill")).toBeNull();
  });
});
