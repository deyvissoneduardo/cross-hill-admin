import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AppearanceSettingsForm,
  type SaveAppearanceAction,
} from "@/src/features/configuracoes/components/AppearanceSettingsForm";
import {
  DEFAULT_APPEARANCE,
  type AppearanceSettingsDTO,
} from "@/src/features/configuracoes/types";
import {
  configuracoesTexts,
  dominioTexts,
  feedbackTexts,
} from "@/src/shared/constants/texts";
import { actionFail, actionOk } from "@/src/shared/errors";

/**
 * Formulário e prévia de aparência (`design.md` §4.4, PRD CA-11/CA-12).
 *
 * INVARIANT: cores ilegíveis não chegam ao servidor — a mesma validação pura do
 * service roda enquanto o administrador edita, destaca o campo e impede o
 * salvamento; cores legíveis viajam normalizadas para a Server Action.
 * OWNING_LAYER: `component` — comportamento do formulário e da prévia.
 * REAL EXECUTION BOUNDARY: `none`; a persistência real (aceite/recusa com
 * Firestore) está em `tests/integration/settingsService.test.ts`.
 */

function renderForm(
  cores: AppearanceSettingsDTO = DEFAULT_APPEARANCE,
  saveAction: SaveAppearanceAction = vi.fn(async () =>
    actionOk<AppearanceSettingsDTO>(cores),
  ),
) {
  render(<AppearanceSettingsForm cores={cores} saveAction={saveAction} />);
  return { saveAction };
}

/** Bloco colorido da prévia — o elemento que carrega fundo e cor de texto. */
function superficieDaPrevia(): HTMLElement {
  const previa = screen.getByRole("region", { name: configuracoesTexts.previewTitulo });
  const chamada = within(previa).getByText(configuracoesTexts.previewChamada);

  return chamada.parentElement as HTMLElement;
}

describe("AppearanceSettingsForm", () => {
  it("mostra a prévia com as cores persistidas", () => {
    renderForm();

    expect(superficieDaPrevia()).toHaveStyle({
      backgroundColor: "rgb(9, 9, 11)",
      color: "rgb(250, 250, 250)",
    });
    expect(screen.getByText(configuracoesTexts.previewAcao)).toHaveStyle({
      backgroundColor: "rgb(74, 222, 128)",
    });
  });

  it("atualiza a prévia conforme o administrador edita a cor", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.corDestaqueLabel), {
      target: { value: "#facc15" },
    });

    expect(screen.getByText(configuracoesTexts.previewAcao)).toHaveStyle({
      backgroundColor: "rgb(250, 204, 21)",
    });
  });

  it("salva as cores editadas e confirma com o toast do design", async () => {
    const { saveAction } = renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.corDestaqueLabel), {
      target: { value: "#facc15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: configuracoesTexts.salvarAcao }),
    );

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith({
      ...DEFAULT_APPEARANCE,
      corDestaque: "#facc15",
    } satisfies AppearanceSettingsDTO);
    expect(
      await screen.findByText(configuracoesTexts.aparenciaSalva),
    ).toBeInTheDocument();
  });

  it("-> (negative companion) contraste insuficiente destaca o campo e não chama a Server Action", async () => {
    const { saveAction } = renderForm();

    // Texto quase igual ao fundo (`#09090b`): 1.1:1, muito abaixo de 4.5:1.
    fireEvent.change(screen.getByLabelText(configuracoesTexts.corSecundariaLabel), {
      target: { value: "#111111" },
    });

    const campoTexto = screen.getByLabelText(configuracoesTexts.corSecundariaLabel);
    expect(campoTexto).toHaveAttribute("aria-invalid", "true");
    expect(screen.getAllByText(feedbackTexts.coresInvalidas).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: configuracoesTexts.salvarAcao }),
    );

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(feedbackTexts.coresInvalidas);
    expect(saveAction).not.toHaveBeenCalled();
    expect(screen.queryByText(configuracoesTexts.aparenciaSalva)).toBeNull();
  });

  it("volta a aceitar o salvamento quando o contraste é corrigido", async () => {
    const { saveAction } = renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.corSecundariaLabel), {
      target: { value: "#111111" },
    });
    fireEvent.change(screen.getByLabelText(configuracoesTexts.corSecundariaLabel), {
      target: { value: "#ededed" },
    });

    expect(
      screen.getByLabelText(configuracoesTexts.corSecundariaLabel),
    ).not.toHaveAttribute("aria-invalid");

    fireEvent.click(
      screen.getByRole("button", { name: configuracoesTexts.salvarAcao }),
    );

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith({
      ...DEFAULT_APPEARANCE,
      corSecundaria: "#ededed",
    } satisfies AppearanceSettingsDTO);
  });

  it("-> (negative companion) exibe a mensagem devolvida pelo servidor quando o salvamento falha", async () => {
    const saveAction: SaveAppearanceAction = vi.fn(async () =>
      actionFail<AppearanceSettingsDTO>("unavailable", dominioTexts.servicoIndisponivel),
    );
    renderForm(DEFAULT_APPEARANCE, saveAction);

    fireEvent.click(
      screen.getByRole("button", { name: configuracoesTexts.salvarAcao }),
    );

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(dominioTexts.servicoIndisponivel);
    expect(screen.queryByText(configuracoesTexts.aparenciaSalva)).toBeNull();
  });
});
