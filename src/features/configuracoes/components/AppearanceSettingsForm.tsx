"use client";

import { useState } from "react";

import { FeedbackBanner } from "@/src/features/admin/components/FeedbackBanner";
import { AppearancePreview } from "@/src/features/configuracoes/components/AppearancePreview";
import { type AppearanceSettingsDTO } from "@/src/features/configuracoes/types";
import { validateClientColors } from "@/src/features/configuracoes/validators/colorValidator";
import { Button } from "@/src/shared/components/Button";
import { Field } from "@/src/shared/components/Field";
import { Toast } from "@/src/shared/components/Toast";
import { configuracoesTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { type ActionResult, type FieldErrors } from "@/src/shared/errors";

/**
 * Formulário de aparência da área do cliente (`design.md` §4.4, PRD US-08).
 *
 * A prévia atualiza a cada edição e a validação de contraste roda no mesmo
 * instante — é a mesma função pura que o service usa antes de gravar
 * (`validateClientColors`), não uma segunda regra parecida. Cores ilegíveis
 * param aqui: a Server Action não chega a ser chamada, e o administrador vê o
 * campo destacado com o literal de `design.md` §5.1.
 *
 * A barreira real continua sendo o servidor (uma Server Action é alcançável por
 * `POST` direto); esta checagem existe para o erro aparecer enquanto a pessoa
 * edita, sem ida ao servidor.
 */

/** Server Action de salvamento de aparência, vista pela UI. */
export type SaveAppearanceAction = (
  cores: AppearanceSettingsDTO,
) => Promise<ActionResult<AppearanceSettingsDTO>>;

type AppearanceSettingsFormProps = {
  /** Cores persistidas (ou o padrão do produto) no carregamento da página. */
  cores: AppearanceSettingsDTO;
  saveAction: SaveAppearanceAction;
};

const CAMPOS = [
  { campo: "corPrimaria", id: "aparencia-cor-primaria", label: configuracoesTexts.corPrimariaLabel },
  { campo: "corSecundaria", id: "aparencia-cor-secundaria", label: configuracoesTexts.corSecundariaLabel },
  { campo: "corDestaque", id: "aparencia-cor-destaque", label: configuracoesTexts.corDestaqueLabel },
] as const;

export function AppearanceSettingsForm({
  cores: coresIniciais,
  saveAction,
}: AppearanceSettingsFormProps) {
  const [cores, setCores] = useState<AppearanceSettingsDTO>(coresIniciais);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function editar(campo: keyof AppearanceSettingsDTO, valor: string) {
    const atualizadas = { ...cores, [campo]: valor };
    setCores(atualizadas);

    // Revalida a cada edição: o erro some assim que o par volta a ser legível,
    // em vez de esperar uma nova tentativa de salvar.
    const resultado = validateClientColors(atualizadas);
    setFieldErrors(resultado.valido ? {} : resultado.fieldErrors);
  }

  async function salvar() {
    const resultado = validateClientColors(cores);

    if (!resultado.valido) {
      setFieldErrors(resultado.fieldErrors);
      setErroSalvar(feedbackTexts.coresInvalidas);
      return;
    }

    setPending(true);
    setErroSalvar(null);

    try {
      const salvo = await saveAction(resultado.cores);

      if (salvo.ok) {
        setCores(salvo.data ?? resultado.cores);
        setFieldErrors({});
        setToast(configuracoesTexts.aparenciaSalva);
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
      <div className="flex w-full flex-col gap-4 md:max-w-sm">
        {erroSalvar === null ? null : <FeedbackBanner message={erroSalvar} />}

        {CAMPOS.map(({ campo, id, label }) => (
          <Field
            key={campo}
            id={id}
            name={campo}
            type="color"
            label={label}
            value={cores[campo]}
            disabled={pending}
            error={fieldErrors[campo]}
            hint={cores[campo]}
            onChange={(event) => editar(campo, event.target.value)}
          />
        ))}

        {/* Ação ao fim do formulário, nunca no topo (`design.md` §4.4). */}
        <Button type="button" pending={pending} disabled={pending} onClick={salvar}>
          {configuracoesTexts.salvarAcao}
        </Button>
      </div>

      <div className="w-full md:flex-1">
        <AppearancePreview cores={cores} />
      </div>

      {toast === null ? null : <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
