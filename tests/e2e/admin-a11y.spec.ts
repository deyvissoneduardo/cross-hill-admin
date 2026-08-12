import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { E2E_EMULATED_SERVER } from "../../playwright.config";
import { a11yTestConfig, adminE2ESeed, type AdminSeedData } from "./fixtures/adminSeed";

/**
 * CT-22 — Fluxos administrativos principais preservam WCAG 2.1 AA
 * (CA-01, CA-03, CA-05, CA-11, CA-12, CA-13, CA-16).
 *
 * INVARIANT: as telas administrativas mantêm teclado, nomes acessíveis, foco
 * visível, alvos de toque adequados e contraste WCAG 2.1 AA — em mobile e em
 * desktop.
 *
 * OWNING_LAYER: `e2e` — acessibilidade é propriedade da PÁGINA renderizada, não
 * de um componente isolado. Contraste depende das cores efetivamente aplicadas
 * pelo CSS do build, foco visível depende de `:focus-visible` real (jsdom não
 * tem layout nem cascata) e ordem de tabulação depende da árvore inteira. Os
 * testes de componente das tasks anteriores não alcançam nada disso.
 *
 * REAL EXECUTION BOUNDARY: `http` — servidor Next real (build de produção,
 * CSS compilado) apontado para a Emulator Suite, com sessão administrativa
 * emitida pelo login de produção e dados semeados (`fixtures/adminSeed.ts`).
 *
 * Por que a sessão é real e não simulada: sem administrador autenticado as
 * quatro telas administrativas redirecionam para o login e o teste varreria
 * quatro vezes a MESMA página. A sessão nasce do formulário de `/admin/login`;
 * nenhum símbolo de produção foi criado para o teste enxergar sessão.
 *
 * Escopo do veredito: reprovam o caso as violações de impacto `critical` e
 * `serious` (tech_spec §17.3). Violações `moderate`/`minor` continuam visíveis
 * no relatório do axe, mas não bloqueiam — é o recorte que o CT-22 define.
 */

// O seed exige o servidor com Firebase emulado — é onde uma sessão real pode
// ser emitida (ver `playwright.config.ts`).
test.use({ baseURL: E2E_EMULATED_SERVER.baseURL });

/** Rótulos do shell administrativo (`src/shared/constants/texts.ts`). */
const SHELL = {
  areaTitulo: "Painel administrativo",
  pularParaConteudo: "Pular para o conteúdo",
  sair: "Sair",
  atualizar: "Atualizar",
  nav: ["Agendamentos", "Agenda", "Aparência", "Pós-agendamento"],
} as const;

type TelaAdministrativa = {
  nome: string;
  path: string;
  /** Título da tela — é o `<h1>` do shell. */
  titulo: string;
  /**
   * Elemento que só existe depois de a leitura do Firestore resolver. Sem
   * esperar por ele, o axe varreria o esqueleto de carga em vez da tela.
   */
  pronto: (page: Page, seed: AdminSeedData) => Locator;
};

const TELAS_ADMINISTRATIVAS: readonly TelaAdministrativa[] = [
  {
    nome: "dashboard",
    path: "/admin",
    titulo: "Painel de agendamentos",
    pronto: (page) => page.getByRole("article", { name: "Marina Alves" }),
  },
  {
    nome: "agenda",
    path: "/admin/agenda",
    titulo: "Agenda e disponibilidade",
    pronto: (page, seed) =>
      page.getByRole("checkbox", { name: `Liberado ${seed.horarios.disponivel}` }),
  },
  {
    nome: "configurações de aparência",
    path: "/admin/configuracoes/aparencia",
    titulo: "Configurações de aparência",
    pronto: (page) => page.getByLabel("Cor de fundo"),
  },
  {
    nome: "configurações de pós-agendamento",
    path: "/admin/configuracoes/agendamento",
    titulo: "Textos pós-agendamento",
    pronto: (page) => page.getByLabel("Título"),
  },
] as const;

for (const { nome, viewport } of a11yTestConfig.viewports) {
  test.describe(`CT-22 · acessibilidade administrativa em ${nome}`, () => {
    test.use({ viewport });

    test(`@a11y login administrativo sem violações críticas ou sérias em ${nome}`, async ({
      page,
    }) => {
      await page.goto("/admin/login");
      await expect(
        page.getByRole("heading", { level: 1, name: "Acesso administrativo" }),
      ).toBeVisible();

      expect(await violacoesBloqueantes(page)).toEqual([]);
    });

    test(`@a11y telas administrativas sem violações críticas ou sérias em ${nome}`, async ({
      page,
    }) => {
      const seed = await adminE2ESeed(page);

      for (const tela of TELAS_ADMINISTRATIVAS) {
        await abrirTela(page, tela, seed);

        expect(
          await violacoesBloqueantes(page),
          `violações bloqueantes na tela "${tela.nome}" (${nome})`,
        ).toEqual([]);
      }
    });

    test(`@a11y dialog de confirmação acessível pelo teclado em ${nome}`, async ({
      page,
    }) => {
      const seed = await adminE2ESeed(page);
      await abrirTela(page, TELAS_ADMINISTRATIVAS[0], seed);

      const card = page.getByRole("article", { name: "Marina Alves" });
      // Teclado, não clique: é a forma de interação que o CT-22 exige e a única
      // que exercita a movimentação de foco na abertura do dialog.
      await card.getByRole("button", { name: "Confirmar", exact: true }).focus();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog", { name: "Confirmar agendamento" });
      await expect(dialog).toBeVisible();
      // O foco precisa entrar no dialog: se ficar no card, a leitura de tela
      // continua no conteúdo de trás enquanto a decisão é pedida.
      await expect(dialog).toBeFocused();

      expect(
        await violacoesBloqueantes(page),
        `violações bloqueantes com o dialog de confirmação aberto (${nome})`,
      ).toEqual([]);

      // `Escape` fecha sem executar a mutação (`design.md` §4.6).
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(card).toBeVisible();
    });

    test(`@a11y teclado alcança os controles do shell com foco visível em ${nome}`, async ({
      page,
    }) => {
      const seed = await adminE2ESeed(page);
      await abrirTela(page, TELAS_ADMINISTRATIVAS[0], seed);

      // O primeiro tab de uma página administrativa é o atalho de conteúdo:
      // sem ele, o teclado atravessa a navegação inteira em toda navegação.
      await page.keyboard.press("Tab");
      const primeiro = await focoAtual(page);
      expect(primeiro?.nome).toBe(SHELL.pularParaConteudo);

      // A asserção acima já reprova quando não há foco; o ramo vazio existe só
      // para o tipo continuar honesto.
      const percorridos: FocoAtual[] = primeiro === null ? [] : [primeiro];

      // Teto de tabulações: alcança os controles do cabeçalho e da navegação com
      // folga, e impede laço infinito caso o foco fique preso em um elemento.
      // `null` significa que a tabulação saiu do documento (barra do navegador),
      // e por isso não entra na trilha.
      for (let passo = 0; passo < 24; passo += 1) {
        await page.keyboard.press("Tab");
        const foco = await focoAtual(page);

        if (foco !== null) {
          percorridos.push(foco);
        }
      }

      const nomesPercorridos = percorridos.map((foco) => foco.nome);
      for (const esperado of [SHELL.atualizar, SHELL.sair, ...SHELL.nav]) {
        expect(
          nomesPercorridos,
          `controle "${esperado}" não foi alcançado pelo teclado (${nome})`,
        ).toContain(esperado);
      }

      // Foco visível: `app/globals.css` aplica um contorno de 2px em
      // `:focus-visible`, e navegar por teclado é o que o ativa.
      const contornos = percorridos.map(
        (foco) => `${foco.nome}: ${foco.contornoDeFoco}`,
      );
      expect(contornos, "todo elemento focado por teclado precisa de contorno visível").toEqual(
        percorridos.map(
          (foco) => `${foco.nome}: ${a11yTestConfig.contornoDeFocoEsperado}`,
        ),
      );
    });

    test(`@a11y controles principais têm nome acessível e alvo de toque em ${nome}`, async ({
      page,
    }) => {
      const seed = await adminE2ESeed(page);
      await abrirTela(page, TELAS_ADMINISTRATIVAS[0], seed);

      // Nome acessível: consultar por papel + nome só encontra o elemento se o
      // nome computado for exatamente esse (é a asserção, não o atalho).
      await expect(page.getByRole("navigation", { name: SHELL.areaTitulo })).toBeVisible();

      const controles: Locator[] = [
        page.getByRole("button", { name: SHELL.sair }),
        page.getByRole("button", { name: SHELL.atualizar }).first(),
        ...SHELL.nav.map((item) => page.getByRole("link", { name: item, exact: true })),
      ];

      const card = page.getByRole("article", { name: "Marina Alves" });
      await expect(card).toContainText(seed.profissional);
      controles.push(
        card.getByRole("button", { name: "Confirmar", exact: true }),
        card.getByRole("button", { name: "Cancelar", exact: true }),
      );

      for (const controle of controles) {
        await expect(controle).toBeVisible();

        const caixa = await controle.boundingBox();
        const nomeDoControle = (await controle.textContent())?.trim();
        expect(
          caixa === null ? null : Math.round(caixa.height),
          `alvo de toque de "${nomeDoControle}" abaixo do mínimo (${nome})`,
        ).toBeGreaterThanOrEqual(a11yTestConfig.alvoDeToqueMinimoPx);
      }
    });
  });
}

/** Abre a tela e espera o conteúdo que depende de leitura chegar. */
async function abrirTela(
  page: Page,
  tela: TelaAdministrativa,
  seed: AdminSeedData,
): Promise<void> {
  // A agenda depende da data semeada: sem o parâmetro, a tela cai no dia de hoje
  // e a grade nasce vazia.
  const path =
    tela.path === "/admin/agenda" ? `${tela.path}?data=${seed.dataAgenda}` : tela.path;

  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: tela.titulo })).toBeVisible();
  await expect(tela.pronto(page, seed)).toBeVisible();
}

type ViolacaoBloqueante = {
  regra: string;
  impacto: string | undefined | null;
  alvos: string[];
};

/**
 * Violações de impacto `critical`/`serious` do axe na página atual.
 *
 * Devolve a lista (em vez de asserir aqui) para que o spec compare com `[]`: o
 * relatório de falha mostra a regra e o seletor do nó, e não apenas uma
 * contagem.
 */
async function violacoesBloqueantes(page: Page): Promise<ViolacaoBloqueante[]> {
  const resultado = await new AxeBuilder({ page })
    .withTags([...a11yTestConfig.tags])
    .analyze();

  const bloqueantes: readonly string[] = a11yTestConfig.impactosBloqueantes;

  return resultado.violations
    .filter((violacao) => bloqueantes.includes(violacao.impact ?? ""))
    .map((violacao) => ({
      regra: violacao.id,
      impacto: violacao.impact,
      alvos: violacao.nodes.map((no) => no.target.join(" ")),
    }));
}

type FocoAtual = {
  nome: string;
  /** `outline-width` computado, ou `"sem contorno"` quando o estilo é `none`. */
  contornoDeFoco: string;
};

/** Nome e contorno de foco do elemento com foco no momento. */
async function focoAtual(page: Page): Promise<FocoAtual | null> {
  return page.evaluate(() => {
    const elemento = document.activeElement;

    if (!(elemento instanceof HTMLElement) || elemento === document.body) {
      return null;
    }

    const estilo = getComputedStyle(elemento);

    return {
      nome: (elemento.getAttribute("aria-label") ?? elemento.textContent ?? "").trim(),
      contornoDeFoco:
        estilo.outlineStyle === "none" ? "sem contorno" : estilo.outlineWidth,
    };
  });
}
