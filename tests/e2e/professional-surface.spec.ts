import { expect, test } from "@playwright/test";

import { E2E_EMULATED_SERVER } from "../../playwright.config";
import { adminE2ESeed, readProfessionalDocument } from "./fixtures/adminSeed";

/**
 * CT-14 — Bloqueia superfície administrativa de CRUD de profissional (CA-10).
 *
 * INVARIANT: a v1 não expõe rota nem Server Action para mutar profissionais. O
 * profissional é único, configurado fora do produto (PRD RN-10/RN-11), e o
 * painel só o LÊ.
 *
 * OWNING_LAYER: `route-integration` — a invariante é sobre a superfície HTTP
 * publicada pelo deploy, não sobre um componente. O CT-13 já prova, em nível de
 * componente, que a Agenda não renderiza ação de CRUD; ele não detectaria uma
 * rota `app/admin/profissionais/route.ts` esquecida no build, que é exatamente o
 * risco que este caso cobre.
 *
 * REAL EXECUTION BOUNDARY: `http` — servidor Next real (build de produção)
 * apontado para a Emulator Suite, com **sessão administrativa legítima**.
 *
 * Por que o teste roda AUTENTICADO: sem sessão, `proxy.ts` responderia 307 para
 * o login em qualquer caminho sob `/admin` — inclusive em um CRUD de
 * profissional que existisse de fato. O bloqueio da borda mascararia a
 * superfície. Autenticado como administrador, o único motivo possível para a
 * resposta não ser 2xx é a rota não existir: é essa a afirmação do CA-10.
 *
 * Por que a comparação do documento antes/depois: "não existe rota" e "nada
 * mudou" são coisas diferentes. Um handler que respondesse 404 depois de gravar
 * passaria pela primeira asserção; a segunda o pega. O documento semeado tem
 * conteúdo fixo (inclusive `atualizadoEm`), então reexecuções paralelas do seed
 * não fazem a comparação oscilar.
 */

// O seed exige o servidor com Firebase emulado — é onde uma sessão real pode
// ser emitida (ver `playwright.config.ts`).
test.use({ baseURL: E2E_EMULATED_SERVER.baseURL });

/**
 * Superfícies de CRUD de profissional que a v1 **não** deve publicar, com o
 * método que cada operação usaria.
 */
const TENTATIVAS_DE_CRUD = [
  { operacao: "criar", method: "POST", path: "/admin/profissionais" },
  { operacao: "editar", method: "PATCH", path: "/admin/profissionais/id" },
  { operacao: "excluir", method: "DELETE", path: "/admin/profissionais/id" },
] as const;

/** Respostas aceitas para uma superfície inexistente (tech_spec §17.4). */
const STATUS_DE_BLOQUEIO = [403, 404, 405];

test.describe("CT-14 · superfície de CRUD de profissional", () => {
  test("não publica rota de mutação de profissional nem altera a configuração", async ({
    page,
  }) => {
    await adminE2ESeed(page);

    // Precondição: o contexto de requisição usado abaixo precisa chegar
    // AUTENTICADO. Sem esta checagem, um cookie que não viajasse transformaria
    // o redirecionamento da borda em "não existe rota" e o caso passaria vazio.
    const sessao = await page.request.get("/admin", { maxRedirects: 0 });
    expect(
      sessao.status(),
      "as tentativas abaixo precisam sair de uma sessão administrativa válida",
    ).toBe(200);

    const antes = await readProfessionalDocument();

    for (const tentativa of TENTATIVAS_DE_CRUD) {
      // `page.request` compartilha o cookie de sessão do contexto: a requisição
      // chega como administrador autenticado, não como anônimo.
      const response = await page.request.fetch(tentativa.path, {
        method: tentativa.method,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ nome: "Profissional Injetado" }),
        maxRedirects: 0,
      });

      expect(
        STATUS_DE_BLOQUEIO,
        `${tentativa.method} ${tentativa.path} (${tentativa.operacao}) respondeu ${response.status()} — a v1 não deve publicar essa superfície`,
      ).toContain(response.status());
    }

    expect(
      await readProfessionalDocument(),
      "nenhuma tentativa de CRUD pode alterar `configuracoes/profissional`",
    ).toEqual(antes);
  });

  /**
   * Companheiro positivo: o profissional continua LEGÍVEL na Agenda.
   *
   * Sem ele, uma aplicação quebrada (404 em tudo, sessão não emitida) deixaria o
   * caso acima verde pelo motivo errado. Aqui se prova que a superfície de
   * leitura existe e funciona — e que ela não traz controle de mutação junto.
   */
  test("exibe o profissional configurado como leitura, sem controle de mutação", async ({
    page,
  }) => {
    const seed = await adminE2ESeed(page);

    await page.goto(`/admin/agenda?data=${seed.dataAgenda}`);

    const resumo = page.getByRole("region", { name: "Profissional" });
    await expect(resumo).toContainText(seed.profissional);

    // Nenhum controle capaz de submeter mudança do profissional: o bloco é
    // informativo por construção (`SingleProfessionalSummary`).
    await expect(resumo.getByRole("button")).toHaveCount(0);
    await expect(resumo.getByRole("link")).toHaveCount(0);
    await expect(resumo.getByRole("textbox")).toHaveCount(0);
    await expect(resumo.locator("form")).toHaveCount(0);
  });
});
