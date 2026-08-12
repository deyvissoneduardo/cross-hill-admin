import { describe, expect, it } from "vitest";

import { validatePostBookingText } from "@/src/features/configuracoes/validators/textSettingsValidator";
import { configuracoesTexts } from "@/src/shared/constants/texts";

/**
 * Textos exibidos ao cliente após a solicitação (PRD CA-13/RN-13).
 *
 * INVARIANT: só é aceito o conteúdo que o cliente consegue ler — título e
 * descrição presentes, textos dentro do limite de tamanho e sem marcação (os
 * textos são exibidos como texto, nunca interpretados como HTML). Conteúdo
 * recusado nunca chega ao repository, então a configuração anterior sobrevive.
 * OWNING_LAYER: `unit` — função pura, sem I/O.
 * REAL EXECUTION BOUNDARY: `none`. Companheiro de integração (persistência real
 * e preservação da configuração anterior) em CT-17/CT-18,
 * `tests/integration/settingsService.test.ts`.
 */

const TEXTOS_VALIDOS = {
  titulo: "Solicitação recebida",
  descricao: "Você receberá a confirmação em breve.",
  dicas: ["Chegue com 10 minutos de antecedência"],
  avisos: ["Cancelamentos com 2 horas de antecedência"],
};

describe("validatePostBookingText", () => {
  it("aceita os textos completos e devolve o conteúdo aparado", () => {
    const resultado = validatePostBookingText({
      titulo: "  Solicitação recebida  ",
      descricao: "  Você receberá a confirmação em breve.  ",
      dicas: ["  Chegue com 10 minutos de antecedência  "],
      avisos: ["  Cancelamentos com 2 horas de antecedência  "],
    });

    expect(resultado).toEqual({ valido: true, textos: TEXTOS_VALIDOS });
  });

  it("-> (negative companion) recusa título ausente com motivo específico", () => {
    const resultado = validatePostBookingText({ ...TEXTOS_VALIDOS, titulo: "   " });

    expect(resultado).toEqual({
      valido: false,
      motivo: "titulo_obrigatorio",
      fieldErrors: { titulo: configuracoesTexts.tituloObrigatorio },
    });
  });

  it("-> (negative companion) recusa descrição ausente com motivo específico", () => {
    const resultado = validatePostBookingText({ ...TEXTOS_VALIDOS, descricao: "" });

    expect(resultado).toEqual({
      valido: false,
      motivo: "descricao_obrigatoria",
      fieldErrors: { descricao: configuracoesTexts.descricaoObrigatoria },
    });
  });

  it.each([
    { campo: "titulo", payload: { titulo: "<b>Solicitação recebida</b>" } },
    { campo: "descricao", payload: { descricao: "Confirmação <script>alert(1)</script>" } },
    { campo: "dicas", payload: { dicas: ["<img src=x onerror=alert(1)>"] } },
    { campo: "avisos", payload: { avisos: ["Chegue cedo <br>"] } },
  ])("recusa marcação HTML em $campo", ({ campo, payload }) => {
    const resultado = validatePostBookingText({ ...TEXTOS_VALIDOS, ...payload });

    expect(resultado).toEqual({
      valido: false,
      motivo: "html_nao_permitido",
      fieldErrors: { [campo]: configuracoesTexts.htmlNaoPermitido },
    });
  });

  it("descarta linhas em branco das listas sem recusar o salvamento", () => {
    const resultado = validatePostBookingText({
      ...TEXTOS_VALIDOS,
      dicas: ["Chegue com 10 minutos de antecedência", "   ", ""],
      avisos: [],
    });

    expect(resultado).toEqual({
      valido: true,
      textos: {
        ...TEXTOS_VALIDOS,
        dicas: ["Chegue com 10 minutos de antecedência"],
        avisos: [],
      },
    });
  });

  it("recusa lista com mais itens do que o limite", () => {
    const resultado = validatePostBookingText({
      ...TEXTOS_VALIDOS,
      dicas: Array.from({ length: 11 }, (_, indice) => `Dica ${indice + 1}`),
    });

    expect(resultado).toEqual({
      valido: false,
      motivo: "itens_demais",
      fieldErrors: { dicas: configuracoesTexts.itensDemais },
    });
  });

  it.each([
    { campo: "titulo", payload: { titulo: "t".repeat(121) } },
    { campo: "descricao", payload: { descricao: "d".repeat(601) } },
    { campo: "avisos", payload: { avisos: ["a".repeat(201)] } },
  ])("recusa texto acima do limite em $campo", ({ campo, payload }) => {
    const resultado = validatePostBookingText({ ...TEXTOS_VALIDOS, ...payload });

    expect(resultado).toEqual({
      valido: false,
      motivo: "texto_longo",
      fieldErrors: { [campo]: configuracoesTexts.textoLongo },
    });
  });

  it.each([
    { caso: "lista que não é array", payload: { dicas: "Chegue cedo" } },
    { caso: "item que não é texto", payload: { dicas: [42] } },
  ])("recusa $caso", ({ payload }) => {
    const resultado = validatePostBookingText({ ...TEXTOS_VALIDOS, ...payload });

    expect(resultado).toEqual({
      valido: false,
      motivo: "lista_invalida",
      fieldErrors: { dicas: configuracoesTexts.listaInvalida },
    });
  });

  it("trata listas ausentes como vazias", () => {
    const resultado = validatePostBookingText({
      titulo: TEXTOS_VALIDOS.titulo,
      descricao: TEXTOS_VALIDOS.descricao,
    });

    expect(resultado).toEqual({
      valido: true,
      textos: { ...TEXTOS_VALIDOS, dicas: [], avisos: [] },
    });
  });
});
