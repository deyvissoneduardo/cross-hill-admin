"use client";

import { useState } from "react";

import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { type PostBookingTextDTO } from "@/src/features/configuracoes/types";
import { validatePostBookingText } from "@/src/features/configuracoes/validators/textSettingsValidator";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { Toast } from "@/src/shared/components/Toast";
import { configuracoesTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { type ActionResult, type FieldErrors } from "@/src/shared/errors";

/**
 * Formulário dos textos exibidos após a solicitação (`design.md` §4.5, PRD
 * US-09).
 *
 * Tudo que o cliente verá é renderizado como **texto** — na prévia daqui e em
 * qualquer tela futura. Nenhum ponto do produto interpreta esses campos como
 * HTML (`dangerouslySetInnerHTML` não existe no repositório), e o validator
 * recusa marcação na entrada: são as duas metades da mesma garantia (§4 do T6).
 *
 * A validação usada aqui é a MESMA função pura do service
 * (`validatePostBookingText`); conteúdo recusado não chega a chamar a Server
 * Action, e a configuração vigente permanece intacta.
 */

/** Server Action de salvamento dos textos, vista pela UI. */
export type SavePostBookingTextAction = (
  textos: PostBookingTextDTO,
) => Promise<ActionResult<PostBookingTextDTO>>;

type PostBookingTextFormProps = {
  /** Textos persistidos (ou o padrão mínimo) no carregamento da página. */
  textos: PostBookingTextDTO;
  saveAction: SavePostBookingTextAction;
};

type ListaEditavel = "dicas" | "avisos";

const LISTAS = [
  {
    campo: "dicas",
    titulo: configuracoesTexts.dicasLabel,
    itemLabel: configuracoesTexts.dicaLabel,
    adicionar: configuracoesTexts.adicionarDica,
    remover: configuracoesTexts.removerDica,
  },
  {
    campo: "avisos",
    titulo: configuracoesTexts.avisosLabel,
    itemLabel: configuracoesTexts.avisoLabel,
    adicionar: configuracoesTexts.adicionarAviso,
    remover: configuracoesTexts.removerAviso,
  },
] as const satisfies readonly {
  campo: ListaEditavel;
  titulo: string;
  itemLabel: string;
  adicionar: string;
  remover: string;
}[];

export function PostBookingTextForm({
  textos: textosIniciais,
  saveAction,
}: PostBookingTextFormProps) {
  const [textos, setTextos] = useState<PostBookingTextDTO>(textosIniciais);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /** Editar um campo limpa o erro dele — o destaque não sobrevive à correção. */
  function editarCampo(campo: "titulo" | "descricao", valor: string) {
    setTextos((atual) => ({ ...atual, [campo]: valor }));
    limparErro(campo);
  }

  function editarItem(campo: ListaEditavel, indice: number, valor: string) {
    setTextos((atual) => ({
      ...atual,
      [campo]: atual[campo].map((item, posicao) => (posicao === indice ? valor : item)),
    }));
    limparErro(campo);
  }

  function adicionarItem(campo: ListaEditavel) {
    setTextos((atual) => ({ ...atual, [campo]: [...atual[campo], ""] }));
    limparErro(campo);
  }

  function removerItem(campo: ListaEditavel, indice: number) {
    setTextos((atual) => ({
      ...atual,
      [campo]: atual[campo].filter((_, posicao) => posicao !== indice),
    }));
    limparErro(campo);
  }

  function limparErro(campo: string) {
    setFieldErrors((atual) => {
      if (!(campo in atual)) {
        return atual;
      }

      const restante = { ...atual };
      delete restante[campo];

      return restante;
    });
  }

  async function salvar() {
    const resultado = validatePostBookingText(textos);

    if (!resultado.valido) {
      setFieldErrors(resultado.fieldErrors);
      setErroSalvar(Object.values(resultado.fieldErrors)[0] ?? null);
      return;
    }

    setPending(true);
    setErroSalvar(null);

    try {
      const salvo = await saveAction(resultado.textos);

      if (salvo.ok) {
        setTextos(salvo.data ?? resultado.textos);
        setFieldErrors({});
        setToast(configuracoesTexts.textosSalvos);
      } else {
        setFieldErrors(salvo.fieldErrors ?? {});
        setErroSalvar(salvo.message);
      }
    } catch {
      setErroSalvar(feedbackTexts.falhaSalvarConfiguracoes);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="flex w-full flex-col gap-4 md:max-w-xl">
        {erroSalvar === null ? null : <FeedbackBanner message={erroSalvar} />}

        <Field
          id="pos-agendamento-titulo"
          name="titulo"
          label={configuracoesTexts.tituloLabel}
          value={textos.titulo}
          disabled={pending}
          error={fieldErrors.titulo}
          onChange={(event) => editarCampo("titulo", event.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="pos-agendamento-descricao"
            className="text-sm font-medium text-(--color-foreground)"
          >
            {configuracoesTexts.descricaoLabel}
          </label>
          <textarea
            id="pos-agendamento-descricao"
            name="descricao"
            rows={4}
            value={textos.descricao}
            disabled={pending}
            aria-invalid={fieldErrors.descricao ? true : undefined}
            aria-describedby={
              fieldErrors.descricao ? "pos-agendamento-descricao-erro" : undefined
            }
            onChange={(event) => editarCampo("descricao", event.target.value)}
            className={
              "rounded-lg border bg-(--color-surface-2) px-3 py-2 text-sm text-(--color-foreground) " +
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) " +
              (fieldErrors.descricao
                ? "border-(--color-danger)"
                : "border-(--color-border)")
            }
          />
          {fieldErrors.descricao ? (
            <p id="pos-agendamento-descricao-erro" className="text-sm text-(--color-danger)">
              {fieldErrors.descricao}
            </p>
          ) : null}
        </div>

        {LISTAS.map(({ campo, titulo, itemLabel, adicionar, remover }) => (
          <fieldset key={campo} className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-(--color-foreground)">
              {titulo}
            </legend>

            {textos[campo].map((item, indice) => (
              <div key={`${campo}-${indice}`} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  disabled={pending}
                  aria-label={`${itemLabel} ${indice + 1}`}
                  onChange={(event) => editarItem(campo, indice, event.target.value)}
                  className={
                    "min-h-11 flex-1 rounded-lg border border-(--color-border) bg-(--color-surface-2) px-3 " +
                    "text-sm text-(--color-foreground) " +
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  aria-label={`${remover} ${indice + 1}`}
                  onClick={() => removerItem(campo, indice)}
                >
                  {configuracoesTexts.removerAcao}
                </Button>
              </div>
            ))}

            {fieldErrors[campo] ? (
              <p role="alert" className="text-sm text-(--color-danger)">
                {fieldErrors[campo]}
              </p>
            ) : null}

            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => adicionarItem(campo)}
              >
                {adicionar}
              </Button>
            </div>
          </fieldset>
        ))}

        {/* Ação ao fim do formulário, nunca no topo (`design.md` §4.5). */}
        <Button type="button" pending={pending} disabled={pending} onClick={salvar}>
          {configuracoesTexts.salvarAcao}
        </Button>
      </div>

      <section
        aria-labelledby="pos-agendamento-preview-titulo"
        className="flex w-full flex-col gap-2 md:flex-1"
      >
        <h2
          id="pos-agendamento-preview-titulo"
          className="text-xs uppercase tracking-wide text-(--color-muted)"
        >
          {configuracoesTexts.previewPosAgendamento}
        </h2>

        {/* Todo conteúdo abaixo é interpolado como texto — nunca como HTML. */}
        <div className="flex flex-col gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-2) p-4">
          <p className="text-base font-semibold text-(--color-foreground)">
            {textos.titulo}
          </p>
          <p className="text-sm whitespace-pre-line text-(--color-muted)">
            {textos.descricao}
          </p>

          {LISTAS.map(({ campo, titulo }) =>
            textos[campo].some((item) => item.trim().length > 0) ? (
              <div key={`preview-${campo}`} className="flex flex-col gap-1">
                <h3 className="text-xs uppercase tracking-wide text-(--color-muted)">
                  {titulo}
                </h3>
                <ul className="list-disc pl-5 text-sm text-(--color-foreground)">
                  {textos[campo]
                    .filter((item) => item.trim().length > 0)
                    .map((item, indice) => (
                      <li key={`preview-${campo}-${indice}`}>{item}</li>
                    ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      </section>

      {toast === null ? null : <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
