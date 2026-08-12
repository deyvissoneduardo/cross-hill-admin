import { type AppearanceSettingsDTO } from "@/src/features/configuracoes/types";
import { configuracoesTexts } from "@/src/shared/constants/texts";

/**
 * Prévia da área do cliente com as cores em edição (`design.md` §4.4).
 *
 * As cores entram por `style` inline, e não por classe: elas são dado do
 * administrador, não token do produto — não existe classe Tailwind para um hex
 * que ainda não foi salvo. É o único ponto do painel onde isso acontece.
 *
 * Componente de apresentação puro: recebe as cores por prop e não lê
 * configuração nenhuma. Assim a mesma prévia serve ao valor persistido (render
 * do servidor) e ao valor em digitação (estado do formulário), sem duplicar a
 * peça visual.
 */

type AppearancePreviewProps = {
  cores: AppearanceSettingsDTO;
};

export function AppearancePreview({ cores }: AppearancePreviewProps) {
  return (
    <section
      aria-labelledby="aparencia-preview-titulo"
      className="flex flex-col gap-2"
    >
      <h2
        id="aparencia-preview-titulo"
        className="text-xs uppercase tracking-wide text-(--color-muted)"
      >
        {configuracoesTexts.previewTitulo}
      </h2>

      <div
        // `transition-colors` curto e desligado sob movimento reduzido
        // (`design.md` §8/§9): a prévia acompanha a edição sem piscar.
        className="flex flex-col gap-3 rounded-lg border border-(--color-border) p-4 transition-colors duration-150 ease-out motion-reduce:transition-none"
        style={{ backgroundColor: cores.corPrimaria, color: cores.corSecundaria }}
      >
        <p className="text-base font-semibold">{configuracoesTexts.previewChamada}</p>
        <p className="text-sm">{configuracoesTexts.previewTexto}</p>
        <span
          className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors duration-150 ease-out motion-reduce:transition-none"
          style={{ backgroundColor: cores.corDestaque, color: cores.corPrimaria }}
        >
          {configuracoesTexts.previewAcao}
        </span>
      </div>
    </section>
  );
}
