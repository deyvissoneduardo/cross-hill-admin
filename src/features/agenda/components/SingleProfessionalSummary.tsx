import { agendamentoTexts, agendaTexts } from "@/src/shared/constants/texts";

/**
 * Resumo do profissional único, somente leitura (`design.md` §4.3, PRD
 * US-07/CA-10).
 *
 * A v1 não tem cadastro de profissionais: este bloco é puramente informativo —
 * nenhum botão, link ou formulário de criar/editar/excluir profissional existe
 * aqui nem em lugar algum da Agenda. `professional` chega como prop (o caminho
 * legítimo de configuração pública do componente) porque a leitura real da
 * configuração é responsabilidade de Server Component/service, não deste
 * componente de apresentação.
 */

type SingleProfessionalSummaryProps = {
  /** Nome do profissional configurado, ou `null` quando ainda não configurado. */
  professional: string | null;
};

export function SingleProfessionalSummary({
  professional,
}: SingleProfessionalSummaryProps) {
  return (
    <section
      aria-labelledby="agenda-profissional-titulo"
      className="flex flex-col gap-1 rounded-lg border border-(--color-border) bg-(--color-surface-2) p-4"
    >
      <h2
        id="agenda-profissional-titulo"
        className="text-xs uppercase tracking-wide text-(--color-muted)"
      >
        {agendamentoTexts.profissionalRotulo}
      </h2>
      <p className="text-base font-medium text-(--color-foreground)">
        {professional ?? agendaTexts.profissionalNaoConfigurado}
      </p>
    </section>
  );
}
