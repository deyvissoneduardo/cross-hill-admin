import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  PostBookingTextForm,
  type SavePostBookingTextAction,
} from "@/src/features/configuracoes/components/PostBookingTextForm";
import {
  defaultPostBookingText,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import {
  configuracoesTexts,
  dominioTexts,
} from "@/src/shared/constants/texts";
import { actionFail, actionOk } from "@/src/shared/errors";

/**
 * Formulário e prévia dos textos pós-agendamento (`design.md` §4.5, PRD CA-13).
 *
 * INVARIANT: o que o administrador escreve é exibido ao cliente como TEXTO —
 * marcação nunca é interpretada como HTML e nem sequer chega ao servidor —, e
 * textos inválidos não disparam a Server Action, preservando a configuração
 * vigente.
 * OWNING_LAYER: `component`.
 * REAL EXECUTION BOUNDARY: `none`; a persistência real e a preservação da
 * configuração anterior são CT-17/CT-18 em
 * `tests/integration/settingsService.test.ts`.
 */

const SCRIPT_LITERAL = "<script>alert(1)</script>";

function renderForm(
  textos: PostBookingTextDTO = defaultPostBookingText(),
  saveAction: SavePostBookingTextAction = vi.fn(async () =>
    actionOk<PostBookingTextDTO>(textos),
  ),
) {
  const { container } = render(
    <PostBookingTextForm textos={textos} saveAction={saveAction} />,
  );

  return { saveAction, container };
}

function previa(): HTMLElement {
  return screen.getByRole("region", {
    name: configuracoesTexts.previewPosAgendamento,
  });
}

function salvar() {
  fireEvent.click(screen.getByRole("button", { name: configuracoesTexts.salvarAcao }));
}

describe("PostBookingTextForm", () => {
  it("mostra na prévia os textos configurados", () => {
    const textos = defaultPostBookingText();
    renderForm({ ...textos, dicas: ["Chegue 10 minutos antes"], avisos: [] });

    expect(within(previa()).getByText(textos.titulo)).toBeInTheDocument();
    expect(within(previa()).getByText(textos.descricao)).toBeInTheDocument();
    expect(within(previa()).getByText("Chegue 10 minutos antes")).toBeInTheDocument();
  });

  it("renderiza marcação como texto puro, nunca como HTML", () => {
    const { container } = renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.tituloLabel), {
      target: { value: SCRIPT_LITERAL },
    });

    // O conteúdo aparece literalmente — e nenhum elemento foi criado a partir
    // dele (nada de `dangerouslySetInnerHTML` no caminho).
    expect(within(previa()).getByText(SCRIPT_LITERAL)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("-> (negative companion) recusa marcação ao salvar e não chama a Server Action", async () => {
    const { saveAction } = renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.tituloLabel), {
      target: { value: SCRIPT_LITERAL },
    });
    salvar();

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(configuracoesTexts.htmlNaoPermitido);
    expect(screen.getByLabelText(configuracoesTexts.tituloLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(saveAction).not.toHaveBeenCalled();
  });

  it("salva título, descrição, dicas e avisos editados", async () => {
    const { saveAction } = renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.tituloLabel), {
      target: { value: "Solicitação recebida" },
    });
    fireEvent.change(screen.getByLabelText(configuracoesTexts.descricaoLabel), {
      target: { value: "Confirmaremos seu horário em breve." },
    });

    fireEvent.click(
      screen.getByRole("button", { name: configuracoesTexts.adicionarDica }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: `${configuracoesTexts.dicaLabel} 1` }),
      { target: { value: "Chegue 10 minutos antes" } },
    );

    fireEvent.click(
      screen.getByRole("button", { name: configuracoesTexts.adicionarAviso }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: `${configuracoesTexts.avisoLabel} 1` }),
      { target: { value: "Cancele com 2 horas de antecedência" } },
    );

    salvar();

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith({
      titulo: "Solicitação recebida",
      descricao: "Confirmaremos seu horário em breve.",
      dicas: ["Chegue 10 minutos antes"],
      avisos: ["Cancele com 2 horas de antecedência"],
    } satisfies PostBookingTextDTO);
    expect(
      await screen.findByText(configuracoesTexts.textosSalvos),
    ).toBeInTheDocument();
  });

  it("remove um item da lista e ele não viaja no salvamento", async () => {
    const textos = defaultPostBookingText();
    const { saveAction } = renderForm({
      ...textos,
      dicas: ["Chegue 10 minutos antes", "Traga um documento"],
    });

    fireEvent.click(
      screen.getByRole("button", { name: `${configuracoesTexts.removerDica} 1` }),
    );

    expect(within(previa()).queryByText("Chegue 10 minutos antes")).toBeNull();

    salvar();

    await waitFor(() => expect(saveAction).toHaveBeenCalledTimes(1));
    expect(saveAction).toHaveBeenCalledWith({
      ...textos,
      dicas: ["Traga um documento"],
    } satisfies PostBookingTextDTO);
  });

  it("-> (negative companion) título vazio destaca o campo e não chama a Server Action", async () => {
    const { saveAction } = renderForm();

    fireEvent.change(screen.getByLabelText(configuracoesTexts.tituloLabel), {
      target: { value: "   " },
    });
    salvar();

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(configuracoesTexts.tituloObrigatorio);
    expect(screen.getByLabelText(configuracoesTexts.tituloLabel)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(saveAction).not.toHaveBeenCalled();
    expect(screen.queryByText(configuracoesTexts.textosSalvos)).toBeNull();
  });

  it("-> (negative companion) exibe a mensagem devolvida pelo servidor quando o salvamento falha", async () => {
    const saveAction: SavePostBookingTextAction = vi.fn(async () =>
      actionFail<PostBookingTextDTO>("unavailable", dominioTexts.servicoIndisponivel),
    );
    renderForm(defaultPostBookingText(), saveAction);

    salvar();

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(dominioTexts.servicoIndisponivel);
    expect(screen.queryByText(configuracoesTexts.textosSalvos)).toBeNull();
  });
});
