import { describe, expect, it } from "vitest";

import { DEFAULT_APPEARANCE } from "@/src/features/configuracoes/types";
import { validateClientColors } from "@/src/features/configuracoes/validators/colorValidator";
import { configuracoesTexts, feedbackTexts } from "@/src/shared/constants/texts";

/**
 * Legibilidade das cores da área do cliente (PRD CA-11/CA-12, RN-12).
 *
 * INVARIANT: um par de cores só é aceito quando preserva legibilidade WCAG 2.1
 * AA em pelo menos 4.5:1 (1.4.3) nos DOIS pares que carregam texto na área do
 * cliente — `corSecundaria` sobre `corPrimaria` (corpo de texto) e `corPrimaria`
 * sobre `corDestaque` (rótulo da ação sobre o botão de destaque). Abaixo disso o
 * resultado é inválido com motivo `contrast_too_low`, e nenhuma persistência
 * acontece (o service só grava resultado válido).
 * OWNING_LAYER: `unit` — função pura, sem I/O.
 * REAL EXECUTION BOUNDARY: `none`. Companheiro de integração (persistência real
 * das cores validadas/recusadas) em `tests/integration/settingsService.test.ts`.
 */

describe("validateClientColors", () => {
  it("CT-15 · aceita contraste WCAG AA e devolve as cores normalizadas", () => {
    const resultado = validateClientColors({
      corPrimaria: "#0a0a0a",
      corSecundaria: "#ededed",
      corDestaque: "#4ade80",
    });

    expect(resultado).toEqual({
      valido: true,
      cores: {
        corPrimaria: "#0a0a0a",
        corSecundaria: "#ededed",
        corDestaque: "#4ade80",
      },
    });
  });

  it("CT-16 · -> (negative companion) rejeita contraste abaixo de WCAG AA com motivo de contraste", () => {
    const resultado = validateClientColors({
      corPrimaria: "#111111",
      corSecundaria: "#222222",
      corDestaque: "#4ade80",
    });

    expect(resultado).toEqual({
      valido: false,
      motivo: "contrast_too_low",
      fieldErrors: {
        corPrimaria: feedbackTexts.coresInvalidas,
        corSecundaria: feedbackTexts.coresInvalidas,
      },
    });
  });

  it("rejeita destaque que some no fundo, mesmo com texto legível", () => {
    const resultado = validateClientColors({
      corPrimaria: "#0a0a0a",
      // 16.9:1 sobre o fundo — o texto sozinho passaria.
      corSecundaria: "#ededed",
      // 1.1:1 sobre o fundo: some no elemento de destaque.
      corDestaque: "#1a1a1a",
    });

    expect(resultado).toEqual({
      valido: false,
      motivo: "contrast_too_low",
      fieldErrors: {
        corPrimaria: feedbackTexts.coresInvalidas,
        corDestaque: feedbackTexts.coresInvalidas,
      },
    });
  });

  /**
   * A faixa entre o piso de elemento gráfico (1.4.11, 3:1) e o de texto (1.4.3,
   * 4.5:1). O botão de destaque da prévia NÃO é um bloco de cor mudo: ele exibe
   * o rótulo da ação em `corPrimaria` sobre `corDestaque`. Um par nessa faixa
   * passaria por 1.4.11 e ainda assim entregaria um botão cujo rótulo o cliente
   * não lê — por isso o piso aplicado ao par é o de texto.
   */
  it.each([
    { caso: "3.77:1 — acima de 3:1, abaixo de 4.5:1", destaque: "#6c6c6c", valido: false },
    { caso: "4.61:1 — acima de 4.5:1", destaque: "#7a7a7a", valido: true },
  ])("destaque com $caso é aceito=$valido", ({ destaque, valido }) => {
    const resultado = validateClientColors({
      corPrimaria: "#0a0a0a",
      corSecundaria: "#ededed",
      corDestaque: destaque,
    });

    expect(resultado).toEqual(
      valido
        ? {
            valido: true,
            cores: {
              corPrimaria: "#0a0a0a",
              corSecundaria: "#ededed",
              corDestaque: destaque,
            },
          }
        : {
            valido: false,
            motivo: "contrast_too_low",
            fieldErrors: {
              corPrimaria: feedbackTexts.coresInvalidas,
              corDestaque: feedbackTexts.coresInvalidas,
            },
          },
    );
  });

  it.each([
    { caso: "sem #", valor: "0a0a0a" },
    { caso: "com dígito fora do hexadecimal", valor: "#zzzzzz" },
    { caso: "com nome de cor CSS", valor: "black" },
    { caso: "ausente", valor: undefined },
    { caso: "não-string", valor: 16 },
  ])("recusa cor $caso antes de calcular contraste", ({ valor }) => {
    const resultado = validateClientColors({
      corPrimaria: valor,
      corSecundaria: "#ededed",
      corDestaque: "#4ade80",
    });

    expect(resultado).toEqual({
      valido: false,
      motivo: "cor_invalida",
      fieldErrors: { corPrimaria: configuracoesTexts.corInvalida },
    });
  });

  it("normaliza grafia curta e maiúscula para #rrggbb minúsculo", () => {
    const resultado = validateClientColors({
      corPrimaria: " #000 ",
      corSecundaria: "#FFF",
      corDestaque: "#0F0",
    });

    expect(resultado).toEqual({
      valido: true,
      cores: {
        corPrimaria: "#000000",
        corSecundaria: "#ffffff",
        corDestaque: "#00ff00",
      },
    });
  });

  it("aceita as cores padrão do produto — a área do cliente nunca nasce ilegível", () => {
    expect(validateClientColors(DEFAULT_APPEARANCE)).toEqual({
      valido: true,
      cores: DEFAULT_APPEARANCE,
    });
  });
});
