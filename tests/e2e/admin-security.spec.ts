import { expect, test, type Page } from "@playwright/test";

import { E2E_FIREBASE_ADMIN_ENV } from "../../playwright.config";
import { ADMIN_SESSION_COOKIE } from "../../src/features/admin/sessionCookie";

/**
 * CT-21 — Bloqueia acesso não autorizado a superfícies administrativas (CA-16).
 *
 * INVARIANT: pessoa sem sessão administrativa válida não alcança listagens
 * administrativas nem despacha Server Action — em rota administrativa OU em
 * qualquer outra rota que não seja a vitrine pública `/`, já que o despacho é
 * resolvido pelo header `Next-Action`, não pelo pathname. A vitrine `/` é a
 * única exceção da borda, porque é a única rota que despacha action anônima
 * (consultar disponibilidade e solicitar horário); liberar o despacho ali não
 * libera nada administrativo, porque toda action administrativa nasce de
 * `adminAction()` — a guarda de sessão é estrutural, não de borda.
 * OWNING_LAYER: `route-integration` — a invariante vive na borda HTTP, antes de
 * qualquer código de rota; um teste de unidade sobre `assertAdminSession` não
 * detectaria uma rota administrativa esquecida fora da guarda, nem um matcher de
 * proxy estreito demais para o despacho de action, nem a exceção da vitrine
 * pública larga demais (`startsWith("/")` no lugar de igualdade).
 * REAL EXECUTION BOUNDARY: `http` — servidor Next real (build de produção), com
 * o Firebase Admin configurado (`E2E_FIREBASE_ADMIN_ENV`) e sem sessão.
 *
 * Por que o servidor recebe configuração Firebase: sem credencial nenhuma,
 * `getAdminSession()` recusa qualquer cookie por *configuração ausente* — o
 * mesmo desfecho observável de um cookie recusado pela verificação. O cenário do
 * cookie forjado ficava verde pelo motivo errado. Com a configuração completa (e
 * fora do modo emulador), a única causa possível de recusa é o próprio cookie; o
 * teste asserta essa precondição e falha se ela regredir.
 *
 * Limite conhecido desta camada: sem credencial de um projeto Firebase real é
 * impossível *emitir* um cookie de sessão legítimo, então o E2E não cobre o lado
 * positivo (cookie válido → acesso) nem a checagem de assinatura contra as
 * chaves públicas do Google. Essa cobertura vive em
 * `src/features/admin/auth.test.ts`, que exercita o verificador real do Admin
 * SDK offline e o predicado de autorização nos dois pontos de uso.
 *
 * Sobre "Firestore sem mutações": as requisições abaixo são interrompidas antes
 * do roteamento e o projeto configurado é descartável (`demo-…`), logo nenhuma
 * escrita real é possível. A checagem direta no emulador Firestore fica
 * registrada como pendência da task (emulador indisponível neste ambiente).
 *
 * Isolamento: o Playwright cria um contexto novo por teste, então nenhum teste
 * herda cookie de outro (inclusive o do cookie forjado).
 */

const LOGIN_PATH = "/admin/login";
/** Cabeçalhos de um despacho de Server Action do App Router. */
const SERVER_ACTION_HEADERS = {
  "Next-Action": "mutacao-administrativa",
  "Content-Type": "text/plain;charset=UTF-8",
} as const;

/** Superfícies administrativas do mapa de rotas (tech_spec §4.1). */
const ROTAS_ADMIN_PROTEGIDAS = [
  "/admin",
  "/admin/agenda",
  "/admin/configuracoes/aparencia",
  "/admin/configuracoes/agendamento",
] as const;

/**
 * Rotas fora de `/admin` que **não** são a vitrine pública `/` — a exceção da
 * borda vale só para `/` exatamente. Não precisam existir no mapa de rotas: o
 * proxy roda antes do roteamento, e é justamente por isso que elas provam o
 * bloqueio. Se a exceção fosse escrita como prefixo (`startsWith("/")`), estas
 * responderiam 404/200 em vez do 307 do login.
 */
const ROTAS_SEM_ACTION_PUBLICA = ["/rota-arbitraria", "/algo/aninhado"] as const;

function pathnameDoRedirect(location: string | undefined, baseURL: string): string {
  expect(location, "resposta de bloqueio deve trazer o header Location").toBeTruthy();
  return new URL(location as string, baseURL).pathname;
}

/**
 * Precondição de todo o CT-21: o servidor sob teste está com o Firebase Admin
 * configurado, fora do modo emulador. Sem isso qualquer cookie seria recusado
 * por *configuração ausente*, e o cenário do cookie forjado ficaria verde pelo
 * motivo errado — por isso as verificações abaixo FALHAM em vez de pular, e
 * rodam explicitamente no `beforeAll` do describe, antes de qualquer cenário
 * (incluindo o do cookie forjado): uma falha aqui precisa ser ruidosa e visível
 * por si só, não uma checagem implícita escondida dentro do fluxo de outro
 * teste.
 */
async function assertServidorComFirebaseConfigurado(page: Page): Promise<void> {
  // (a) A configuração declara tudo que o Admin SDK e a autorização exigem —
  // remover qualquer uma destas variáveis muda a causa da recusa e invalidaria
  // o cenário. (Quem prova que o servidor as RECEBEU é a testemunha (c): uma
  // comparação com o objeto do próprio módulo não provaria nada.)
  expect(Object.keys(E2E_FIREBASE_ADMIN_ENV).sort()).toEqual([
    "ADMIN_EMAIL",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_PROJECT_ID",
  ]);
  expect(E2E_FIREBASE_ADMIN_ENV.FIREBASE_PRIVATE_KEY).toMatch(
    /^-----BEGIN PRIVATE KEY-----/,
  );

  // (b) Em modo emulador o Admin SDK dispensa a verificação de assinatura — o
  // cenário perderia o sentido, então o ambiente não pode estar emulado.
  expect(
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
    "rode o CT-21 sem emulador de Auth: ele desliga a verificação de assinatura",
  ).toBeUndefined();
  expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined();

  // (c) Testemunha em runtime de que o servidor REALMENTE recebeu esse ambiente:
  // um login com e-mail que não é o do administrador só é recusado como
  // `credenciais` quando `ADMIN_EMAIL` está configurado; sem configuração a
  // recusa viria como `indisponivel`. É a prova que separa "cookie recusado" de
  // "servidor sem credencial".
  await page.goto(LOGIN_PATH);
  await page.getByLabel("E-mail").fill("nao-e-o-admin@crosshill.test");
  await page.getByLabel("Senha").fill("senha-qualquer");
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL((url) => url.searchParams.has("erro"), { timeout: 15_000 });
  const urlDaRecusa = new URL(page.url());
  expect(urlDaRecusa.pathname).toBe(LOGIN_PATH);
  expect(
    urlDaRecusa.search,
    "`erro=indisponivel` significa servidor sem ADMIN_EMAIL/credencial: a recusa do cookie forjado não provaria nada",
  ).toBe("?erro=credenciais");
}

test.describe("CT-21 · acesso não autorizado a superfícies administrativas", () => {
  // Smoke check explícito do describe: roda antes de qualquer cenário deste
  // describe (incluindo o do cookie forjado) e falha ruidosamente — em vez de
  // ficar implícito dentro do fluxo de outro teste — se o Admin SDK não
  // estiver com credencial real configurada. `browser.newPage()` porque
  // `beforeAll` não recebe a fixture `page` (ela é por teste, não por worker).
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await assertServidorComFirebaseConfigurado(page);
    } finally {
      await page.close();
    }
  });

  for (const rota of ROTAS_ADMIN_PROTEGIDAS) {
    test(`bloqueia leitura de ${rota} sem sessão`, async ({ request, baseURL }) => {
      const response = await request.get(rota, { maxRedirects: 0 });

      expect(response.status()).toBe(307);
      expect(pathnameDoRedirect(response.headers()["location"], baseURL!)).toBe(
        LOGIN_PATH,
      );
    });
  }

  test("bloqueia mutação administrativa sem sessão", async ({ request, baseURL }) => {
    // Server Action é despachada por POST na própria rota, com o header
    // `Next-Action`. O bloqueio precisa acontecer antes do handler existir.
    const response = await request.post("/admin", {
      headers: SERVER_ACTION_HEADERS,
      data: "[]",
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(pathnameDoRedirect(response.headers()["location"], baseURL!)).toBe(LOGIN_PATH);
  });

  for (const rota of ROTAS_SEM_ACTION_PUBLICA) {
    test(`bloqueia despacho de Server Action endereçado a ${rota}`, async ({
      request,
      baseURL,
    }) => {
      // O App Router resolve a Server Action pelo header `Next-Action`, não pelo
      // pathname: o mesmo POST vale endereçado a qualquer rota. Um matcher
      // restrito a `/admin` deixaria passar — este cenário é a prova de que o
      // matcher amplo fecha esse caminho. O 307 só pode ter vindo do proxy:
      // fosse a requisição roteada, uma rota inexistente responderia 404.
      const response = await request.post(rota, {
        headers: SERVER_ACTION_HEADERS,
        data: "[]",
        maxRedirects: 0,
      });

      expect(response.status()).toBe(307);
      expect(pathnameDoRedirect(response.headers()["location"], baseURL!)).toBe(
        LOGIN_PATH,
      );
    });
  }

  // Companheiro positivo da exceção da borda: a vitrine `/` é a única rota que
  // despacha Server Action sem sessão (consultar disponibilidade e solicitar
  // horário — `src/features/agendamentos/publicActions.ts`). Sem este cenário, o
  // bloqueio universal do despacho volta a passar verde e o fluxo público fica
  // inacessível pela UI real (troca de data e submissão viram redirect ao login).
  test("vitrine pública despacha Server Action sem sessão", async ({ request }) => {
    const response = await request.post("/", {
      headers: SERVER_ACTION_HEADERS,
      data: "[]",
      maxRedirects: 0,
    });

    // Prova positiva de que o despacho atravessou a borda e chegou ao App
    // Router: o id acima é sintético, então quem responde é o handler de action,
    // com "não encontrada" (`handleUnrecognizedFetchAction` em
    // `next/dist/server/app-render/action-handler.js` — 404 + este header +
    // corpo `Server action not found.`). Bloqueado no proxy, o mesmo POST teria
    // virado 307 para o login sem nunca resolver action alguma.
    expect(response.status()).toBe(404);
    expect(response.headers()["x-nextjs-action-not-found"]).toBe("1");
  });

  // Companheiro positivo do matcher amplo: cobrir todas as rotas não pode
  // transformar o site público em área restrita — o bloqueio é direcionado.
  test("entrada pública permanece acessível sem sessão", async ({ request, page }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(200);

    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("navegação sem sessão termina no login sem expor a área administrativa", async ({
    page,
  }) => {
    await page.goto("/admin");

    expect(new URL(page.url()).pathname).toBe(LOGIN_PATH);
    await expect(
      page.getByRole("heading", { level: 1, name: "Acesso administrativo" }),
    ).toBeVisible();
    // O shell administrativo (navegação + ação de sair) não pode ter renderizado.
    await expect(page.getByRole("navigation", { name: "Painel administrativo" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Sair" })).toHaveCount(0);
  });

  test("cookie de sessão forjado não é aceito como sessão válida", async ({
    page,
    context,
    baseURL,
  }) => {
    // Precondição (Admin SDK configurado, fora do modo emulador) já foi
    // asserida explicitamente no `beforeAll` do describe, antes deste cenário.

    // A borda (`proxy.ts`) só vê que existe cookie; quem recusa o cookie inválido
    // é a verificação autoritativa `getAdminSession()`.
    await context.addCookies([
      { name: ADMIN_SESSION_COOKIE, value: "cookie-forjado", url: baseURL! },
    ]);

    await page.goto(LOGIN_PATH);

    // Uma sessão aceita seria redirecionada para `/admin` pela própria página de
    // login: continuar no login prova que a verificação recusou o cookie.
    expect(new URL(page.url()).pathname).toBe(LOGIN_PATH);
    await expect(
      page.getByRole("heading", { level: 1, name: "Acesso administrativo" }),
    ).toBeVisible();
  });

  // Companheiro positivo: o bloqueio é direcionado, não uma barreira cega sobre
  // todo o `/admin` — sem ele o login também ficaria inacessível.
  test("login administrativo permanece acessível sem sessão", async ({
    request,
    page,
  }) => {
    const response = await request.get(LOGIN_PATH, { maxRedirects: 0 });
    expect(response.status()).toBe(200);

    await page.goto(LOGIN_PATH);
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });
});
