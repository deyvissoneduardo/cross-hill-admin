import { type ConfirmerParty } from "@/src/features/agendamentos/types";
import { agendamentoTexts } from "@/src/shared/constants/texts";
import { formatInstantPtBr } from "@/src/shared/time";

/**
 * Linhas de confirmação das duas partes de um agendamento (`design.md` §4.2).
 *
 * Mostra o profissional e o administrador — cada um confirmado (com o instante)
 * ou pendente — e quem confirmou primeiro. Nunca deriva status: o status
 * canônico vem do DTO (PRD RN-15/RN-16) e ver as duas confirmações aqui não
 * significa que o agendamento saiu de `aguardando agendamento`.
 *
 * Estado nunca é comunicado só por cor (`design.md` §9): a palavra "pendente" ou
 * "confirmado" está no próprio texto da linha, e o ponto colorido é decorativo.
 */

type ConfirmationTimelineProps = {
  adminConfirmadoEm: string | null;
  profissionalConfirmadoEm: string | null;
  confirmadoPrimeiroPor: ConfirmerParty | null;
};

const PARTY_LABEL: Record<ConfirmerParty, string> = {
  admin: agendamentoTexts.primeiroConfirmadorAdmin,
  profissional: agendamentoTexts.primeiroConfirmadorProfissional,
};

export function ConfirmationTimeline({
  adminConfirmadoEm,
  profissionalConfirmadoEm,
  confirmadoPrimeiroPor,
}: ConfirmationTimelineProps) {
  // O profissional vem primeiro, na ordem do card em `design.md` §4.2.
  const linhas = [
  ] as const;

  return (
    <div className="flex flex-col gap-1">
      <h4 className="sr-only">{agendamentoTexts.confirmacoesTitulo}</h4>

      <ul className="flex flex-col gap-1">
       
      </ul>

      {confirmadoPrimeiroPor === null ? null : (
        <p className="text-xs text-(--color-muted)">
          {`${agendamentoTexts.primeiroConfirmadorRotulo}: ${PARTY_LABEL[confirmadoPrimeiroPor]}`}
        </p>
      )}
    </div>
  );
}

/** `"confirmado em 14/08/2026 às 14:32"`, `"confirmado"` ou `"pendente"`. */
function describeConfirmation(confirmadoEm: string | null): string {
  if (confirmadoEm === null) {
    return agendamentoTexts.confirmacaoPendente;
  }

  const instante = formatConfirmationInstant(confirmadoEm);

  // Timestamp ilegível não pode apagar a confirmação: ela existe, só não há
  // instante para exibir.
  return instante === null
    ? agendamentoTexts.confirmacaoRegistrada
    : `${agendamentoTexts.confirmacaoRegistradaEm} ${instante}`;
}

/**
 * ISO-8601 UTC → `15/08/2026 às 14:32` na hora local da operação, ou `null`
 * quando o timestamp persistido é ilegível.
 *
 * A conversão em si é de `shared/time` (offset canônico da operação); aqui só se
 * decide o que fazer com a falha — este componente não pode derrubar o card por
 * causa de um timestamp corrompido.
 */
function formatConfirmationInstant(isoInstant: string): string | null {
  try {
    return formatInstantPtBr(isoInstant);
  } catch {
    return null;
  }
}
