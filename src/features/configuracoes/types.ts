import { configuracoesTexts } from "@/src/shared/constants/texts";

/**
 * Domínio de configurações: cores da área do cliente e textos exibidos depois
 * da solicitação (tech_spec §7.2).
 *
 * Os dois DTOs são serializáveis por construção (apenas strings e listas de
 * string): eles atravessam a fronteira Server Action → Client Component e são
 * gravados como documento Firestore sem conversão intermediária.
 *
 * O significado de cada cor é parte do contrato, não convenção da UI: a
 * validação de contraste (`colorValidator`) compara texto contra fundo e
 * destaque contra fundo — trocar o papel de um campo mudaria a regra de
 * legibilidade, não só a aparência.
 */

/** Cores configuráveis da área do cliente (PRD US-08/RN-12). */
export type AppearanceSettingsDTO = {
  /** Fundo da área do cliente, em `#rrggbb`. */
  corPrimaria: string;
  /** Texto exibido sobre o fundo, em `#rrggbb`. */
  corSecundaria: string;
  /** Realce de ações e destaques sobre o fundo, em `#rrggbb`. */
  corDestaque: string;
};

/** Textos exibidos ao cliente após a solicitação (PRD US-09/RN-13). */
export type PostBookingTextDTO = {
  titulo: string;
  descricao: string;
  dicas: string[];
  avisos: string[];
};

/**
 * Cores usadas enquanto o administrador não configurou nenhuma.
 *
 * São os tokens do próprio produto (`app/globals.css`) e passam pela mesma
 * validação de contraste exigida do administrador — um default ilegível seria
 * a única forma de a área do cliente nascer fora do WCAG AA.
 */
export const DEFAULT_APPEARANCE: AppearanceSettingsDTO = {
  corPrimaria: "#09090b",
  corSecundaria: "#fafafa",
  corDestaque: "#4ade80",
} as const;

/**
 * Textos mínimos exibidos enquanto nada foi salvo (`design.md` §5: a prévia
 * mostra estado mínimo com título/descrição padrão).
 *
 * É função, e não constante: o DTO carrega listas mutáveis, e uma constante
 * compartilhada viraria estado global assim que um formulário editasse a lista
 * recebida.
 */
export function defaultPostBookingText(): PostBookingTextDTO {
  return {
    titulo: configuracoesTexts.padraoTitulo,
    descricao: configuracoesTexts.padraoDescricao,
    dicas: [],
    avisos: [],
  };
}
