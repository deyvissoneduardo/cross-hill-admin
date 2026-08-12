import { type PostBookingTextDTO } from "@/src/features/configuracoes/types";
import { configuracoesTexts } from "@/src/shared/constants/texts";
import { type FieldErrors } from "@/src/shared/errors";

/**
 * Validação dos textos exibidos ao cliente após a solicitação (PRD RN-13/CA-13).
 *
 * Função **pura**, sem I/O e sem `server-only`, pelo mesmo motivo do
 * `colorValidator`: a regra roda no formulário (erro inline) e no service antes
 * de gravar, e as duas precisam ser a MESMA regra — senão o formulário aceita o
 * que o service recusa (ou pior, o inverso).
 *
 * Duas decisões de conteúdo moram aqui:
 *
 * 1. **Marcação não é aceita.** Os textos são renderizados como texto puro na
 *    experiência do cliente (nenhum ponto do produto usa `dangerouslySetInnerHTML`),
 *    então `<b>` chegaria ao cliente literalmente — e um `<script>` gravado seria
 *    uma bomba armada para o dia em que alguém decidisse interpretar o campo como
 *    HTML. Recusar na entrada é a barreira que não depende de quem renderiza.
 * 2. **Linha em branco é ruído, não erro.** O formulário edita dicas/avisos como
 *    lista de linhas; uma linha vazia deixada para trás não invalida o
 *    salvamento — ela some. O que invalida é conteúdo que o cliente não
 *    conseguiria ler: título/descrição ausentes, texto longo demais ou lista com
 *    itens demais.
 *
 * Não lança: devolve resultado discriminado com o motivo, que o service registra
 * no log (sem o texto em si) e o formulário usa para destacar o campo.
 */

const MAX_TITULO = 120;
const MAX_DESCRICAO = 600;
const MAX_ITEM = 200;
const MAX_ITENS = 10;
/** Qualquer sinal de marcação: o texto é exibido como texto, nunca como HTML. */
const MARCACAO = /[<>]/;

/** Por que os textos foram recusados. */
export type PostBookingTextIssue =
  | "titulo_obrigatorio"
  | "descricao_obrigatoria"
  | "texto_longo"
  | "itens_demais"
  | "lista_invalida"
  | "html_nao_permitido";

/** Entrada crua do formulário/Server Action — nada garante o tipo declarado. */
export type PostBookingTextInput = {
  titulo?: unknown;
  descricao?: unknown;
  dicas?: unknown;
  avisos?: unknown;
};

export type PostBookingTextValidationResult =
  | { valido: true; textos: PostBookingTextDTO }
  | {
      valido: false;
      motivo: PostBookingTextIssue;
      fieldErrors: FieldErrors;
    };

/**
 * Valida e normaliza os textos pós-agendamento.
 *
 * Devolve o PRIMEIRO problema encontrado, na ordem em que os campos aparecem na
 * tela: o administrador corrige de cima para baixo, e listar tudo de uma vez não
 * mudaria a próxima ação dele.
 */
export function validatePostBookingText(
  input: PostBookingTextInput,
): PostBookingTextValidationResult {
  const titulo = asText(input.titulo);
  if (titulo.length === 0) {
    return recusar("titulo_obrigatorio", "titulo", configuracoesTexts.tituloObrigatorio);
  }
  if (titulo.length > MAX_TITULO) {
    return recusar("texto_longo", "titulo", configuracoesTexts.textoLongo);
  }
  if (MARCACAO.test(titulo)) {
    return recusar("html_nao_permitido", "titulo", configuracoesTexts.htmlNaoPermitido);
  }

  const descricao = asText(input.descricao);
  if (descricao.length === 0) {
    return recusar(
      "descricao_obrigatoria",
      "descricao",
      configuracoesTexts.descricaoObrigatoria,
    );
  }
  if (descricao.length > MAX_DESCRICAO) {
    return recusar("texto_longo", "descricao", configuracoesTexts.textoLongo);
  }
  if (MARCACAO.test(descricao)) {
    return recusar(
      "html_nao_permitido",
      "descricao",
      configuracoesTexts.htmlNaoPermitido,
    );
  }

  const dicas = normalizeList(input.dicas, "dicas");
  if (!dicas.valido) {
    return dicas;
  }

  const avisos = normalizeList(input.avisos, "avisos");
  if (!avisos.valido) {
    return avisos;
  }

  return {
    valido: true,
    textos: { titulo, descricao, dicas: dicas.itens, avisos: avisos.itens },
  };
}

export const textSettingsValidator = { validatePostBookingText } as const;

type ListResult =
  | { valido: true; itens: string[] }
  | {
      valido: false;
      motivo: PostBookingTextIssue;
      fieldErrors: FieldErrors;
    };

/** Aparar, descartar linhas vazias e recusar item ilegível ou com marcação. */
function normalizeList(value: unknown, field: string): ListResult {
  if (value === undefined || value === null) {
    return { valido: true, itens: [] };
  }

  if (!Array.isArray(value)) {
    return recusar("lista_invalida", field, configuracoesTexts.listaInvalida);
  }

  const itens: string[] = [];

  for (const bruto of value) {
    if (typeof bruto !== "string") {
      return recusar("lista_invalida", field, configuracoesTexts.listaInvalida);
    }

    const item = bruto.trim();
    if (item.length === 0) {
      continue;
    }

    if (item.length > MAX_ITEM) {
      return recusar("texto_longo", field, configuracoesTexts.textoLongo);
    }

    if (MARCACAO.test(item)) {
      return recusar("html_nao_permitido", field, configuracoesTexts.htmlNaoPermitido);
    }

    itens.push(item);
  }

  if (itens.length > MAX_ITENS) {
    return recusar("itens_demais", field, configuracoesTexts.itensDemais);
  }

  return { valido: true, itens };
}

function recusar(
  motivo: PostBookingTextIssue,
  field: string,
  message: string,
): { valido: false; motivo: PostBookingTextIssue; fieldErrors: FieldErrors } {
  return { valido: false, motivo, fieldErrors: { [field]: message } };
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
