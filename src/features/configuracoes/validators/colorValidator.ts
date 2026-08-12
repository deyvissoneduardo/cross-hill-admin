import { type AppearanceSettingsDTO } from "@/src/features/configuracoes/types";
import { configuracoesTexts, feedbackTexts } from "@/src/shared/constants/texts";
import { type FieldErrors } from "@/src/shared/errors";

/**
 * Validação de legibilidade das cores da área do cliente (PRD RN-12/CA-12).
 *
 * Função **pura**, sem I/O e sem `server-only`, de propósito: a mesma regra
 * roda no formulário (erro inline enquanto o administrador edita, `design.md`
 * §4.4) e no service antes de gravar. Se a validação morasse só no servidor, a
 * prévia poderia sugerir que um par ilegível é aceitável; se morasse só no
 * cliente, um `POST` direto na Server Action gravaria o par ilegível.
 *
 * Diferente dos validators de `shared/validators.ts`, esta função **não lança**:
 * devolve um resultado discriminado com o motivo (`contrast_too_low`,
 * `cor_invalida`). O motivo é o dado que o service registra no log e que o
 * formulário usa para destacar o campo — um `AppError` genérico apagaria a
 * distinção entre "cor malformada" e "cores legíveis demais parecidas".
 *
 * O cálculo segue WCAG 2.1: luminância relativa e razão de contraste
 * `(L1 + 0.05) / (L2 + 0.05)`.
 *
 * **Os dois pares exigem 4.5:1 porque os dois carregam texto.** O piso não sai do
 * nome do campo, sai do que a área do cliente renderiza (`AppearancePreview`):
 *
 * - `corSecundaria` sobre `corPrimaria` — o corpo de texto sobre o fundo.
 * - `corPrimaria` sobre `corDestaque` — o **rótulo da ação** sobre o botão de
 *   destaque (`configuracoesTexts.previewAcao`). O `corDestaque` não é um
 *   elemento gráfico mudo: ele é a superfície de um botão rotulado, então o par
 *   é regido por WCAG 1.4.3 (4.5:1), e não por 1.4.11 (3:1). Esse mesmo par
 *   também precisa satisfazer 1.4.11 pela borda do botão contra o fundo, mas
 *   1.4.11 é o piso mais frouxo dos dois — quem governa é o de texto.
 *
 * Aceitar a faixa 3:1–4.5:1 aqui significaria persistir um botão cujo rótulo o
 * cliente não consegue ler.
 */

/** Piso WCAG 2.1 AA para texto normal (1.4.3) — vale para os dois pares. */
const MIN_CONTRASTE_TEXTO = 4.5;

const HEX_CURTO = /^#[0-9a-f]{3}$/;
const HEX_LONGO = /^#[0-9a-f]{6}$/;

/** Por que um par de cores foi recusado. */
export type ColorIssue = "cor_invalida" | "contrast_too_low";

/** Entrada crua do formulário/Server Action — nada garante o tipo declarado. */
export type AppearanceSettingsInput = {
  corPrimaria?: unknown;
  corSecundaria?: unknown;
  corDestaque?: unknown;
};

export type ColorValidationResult =
  | { valido: true; cores: AppearanceSettingsDTO }
  | { valido: false; motivo: ColorIssue; fieldErrors: FieldErrors };

/**
 * Valida e normaliza as cores da área do cliente.
 *
 * Formato é checado antes do contraste porque contraste de um valor malformado
 * não significa nada — e o administrador precisa saber qual dos dois problemas
 * corrigir. Cores válidas voltam normalizadas (`#ABC` → `#aabbcc`), para o
 * documento nunca guardar duas grafias da mesma cor.
 */
export function validateClientColors(
  input: AppearanceSettingsInput,
): ColorValidationResult {
  const primaria = normalizeHexColor(input.corPrimaria);
  const secundaria = normalizeHexColor(input.corSecundaria);
  const destaque = normalizeHexColor(input.corDestaque);

  const formatoInvalido: FieldErrors = {};
  if (primaria === null) formatoInvalido.corPrimaria = configuracoesTexts.corInvalida;
  if (secundaria === null) formatoInvalido.corSecundaria = configuracoesTexts.corInvalida;
  if (destaque === null) formatoInvalido.corDestaque = configuracoesTexts.corInvalida;

  if (primaria === null || secundaria === null || destaque === null) {
    return { valido: false, motivo: "cor_invalida", fieldErrors: formatoInvalido };
  }

  // Os dois lados do par recebem o erro: o administrador corrige o fundo OU o
  // texto, e destacar só um deles esconderia metade da correção possível.
  const contrasteBaixo: FieldErrors = {};
  // Corpo de texto sobre o fundo da área do cliente.
  if (contrastRatio(secundaria, primaria) < MIN_CONTRASTE_TEXTO) {
    contrasteBaixo.corSecundaria = feedbackTexts.coresInvalidas;
    contrasteBaixo.corPrimaria = feedbackTexts.coresInvalidas;
  }
  // Rótulo da ação (`corPrimaria`) sobre o botão de destaque (`corDestaque`):
  // texto sobre fundo, mesmo piso — ver o cabeçalho deste módulo.
  if (contrastRatio(destaque, primaria) < MIN_CONTRASTE_TEXTO) {
    contrasteBaixo.corDestaque = feedbackTexts.coresInvalidas;
    contrasteBaixo.corPrimaria = feedbackTexts.coresInvalidas;
  }

  if (Object.keys(contrasteBaixo).length > 0) {
    return {
      valido: false,
      motivo: "contrast_too_low",
      fieldErrors: contrasteBaixo,
    };
  }

  return {
    valido: true,
    cores: {
      corPrimaria: primaria,
      corSecundaria: secundaria,
      corDestaque: destaque,
    },
  };
}

export const colorValidator = { validateClientColors } as const;

/** `#ABC`/`#AABBCC` → `#aabbcc`; qualquer outra coisa → `null`. */
function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const hex = value.trim().toLowerCase();

  if (HEX_LONGO.test(hex)) {
    return hex;
  }

  if (HEX_CURTO.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  return null;
}

/** Razão de contraste WCAG 2.1 entre duas cores já normalizadas. */
function contrastRatio(corA: string, corB: string): number {
  const luminanciaA = relativeLuminance(corA);
  const luminanciaB = relativeLuminance(corB);

  const clara = Math.max(luminanciaA, luminanciaB);
  const escura = Math.min(luminanciaA, luminanciaB);

  return (clara + 0.05) / (escura + 0.05);
}

/** Luminância relativa WCAG 2.1 de uma cor `#rrggbb`. */
function relativeLuminance(hex: string): number {
  const vermelho = channelLuminance(Number.parseInt(hex.slice(1, 3), 16));
  const verde = channelLuminance(Number.parseInt(hex.slice(3, 5), 16));
  const azul = channelLuminance(Number.parseInt(hex.slice(5, 7), 16));

  return 0.2126 * vermelho + 0.7152 * verde + 0.0722 * azul;
}

function channelLuminance(valor: number): number {
  const canal = valor / 255;

  return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
}
