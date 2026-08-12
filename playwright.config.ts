import { generateKeyPairSync } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Segundo servidor Next, com o Firebase apontado para a Emulator Suite.
 *
 * Por que existe um SEGUNDO servidor em vez de reconfigurar o primeiro: os dois
 * cenários se excluem. O CT-21 precisa do Admin SDK **fora** do modo emulador —
 * com `FIREBASE_AUTH_EMULATOR_HOST` a verificação de assinatura é dispensada e o
 * cenário do cookie forjado perderia o sentido (o próprio CT-21 assere isso).
 * Já o CT-22/CT-14 precisam do oposto: uma sessão administrativa **de verdade**,
 * e emitir uma exige `createSessionCookie`, que só funciona contra um projeto
 * Firebase real (impossível aqui) ou contra o emulador de Auth.
 *
 * O emulador entra, então, como o único mecanismo real de autenticação
 * disponível offline — e o login continua sendo o de produção: o teste preenche
 * o formulário de `/admin/login`, e é o servidor que troca senha por ID token no
 * Identity Toolkit (emulado) e assina o cookie de sessão. Nenhum atalho de
 * sessão é criado para teste.
 */
const EMULATED_PORT = Number(process.env.E2E_EMULATED_PORT ?? 3101);

/** Emulator Suite usada pelo servidor emulado (portas de `firebase.json`). */
const AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

/**
 * Chave pública do Firebase client usada pelo login do servidor emulado.
 *
 * Precisa estar presente no **build** e não só no runtime: o Next substitui
 * `process.env.NEXT_PUBLIC_*` estaticamente durante `next build`, então definí-la
 * apenas no processo do servidor deixaria `exchangePasswordForIdToken` sem chave
 * e todo login responderia `erro=indisponivel`. O valor é irrelevante — o Auth
 * Emulator aceita qualquer chave —, mas precisa ser o MESMO nos dois lugares.
 */
const E2E_PUBLIC_API_KEY = "demo-e2e-api-key";

/** Profissional único da v1 (PRD RN-10): semente do servidor emulado. */
const E2E_PROFISSIONAL = "Ana Souza";

/** Senha do administrador de E2E, criada no Auth Emulator pelo seed. */
const E2E_ADMIN_PASSWORD = "senha-e2e-do-administrador";

/**
 * Configuração do Firebase Admin do servidor de E2E.
 *
 * Por que existe: antes o servidor subia SEM credencial alguma, e então
 * `getAdminSession()` recusava qualquer cookie por *configuração ausente* — o
 * mesmo desfecho observável de um cookie recusado pela verificação. O cenário do
 * cookie forjado (CT-21) ficava verde sem nunca exercitar a verificação. Com a
 * configuração completa, a única causa possível de recusa é o próprio cookie.
 *
 * A credencial é uma chave RSA **descartável, gerada neste processo**: o E2E
 * nunca fala com um projeto Firebase real e nada sensível é versionado. Ela é
 * usada apenas para inicializar o Admin SDK — os cenários deste suite falham na
 * decodificação do cookie, antes de qualquer chamada de rede.
 *
 * Modo emulador é deliberadamente EVITADO: com `FIREBASE_AUTH_EMULATOR_HOST` o
 * Admin SDK dispensa a verificação de assinatura, o que enfraqueceria o cenário.
 */
export const E2E_FIREBASE_ADMIN_ENV = {
  FIREBASE_PROJECT_ID: "demo-crosshill-e2e",
  FIREBASE_CLIENT_EMAIL: "e2e@demo-crosshill-e2e.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: gerarChavePrivadaDescartavel(),
  ADMIN_EMAIL: "admin-e2e@crosshill.test",
} as const;

function gerarChavePrivadaDescartavel(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

/**
 * Ambiente do servidor Next apontado para a Emulator Suite.
 *
 * Sem credencial de serviço de propósito: `getFirebaseAdminApp()` reconhece o
 * modo emulador pelas duas variáveis `*_EMULATOR_HOST` e inicializa o Admin SDK
 * só com o `projectId` — com emulador não existe (nem deve existir) chave.
 */
const E2E_EMULATED_ENV = {
  FIREBASE_PROJECT_ID: E2E_FIREBASE_ADMIN_ENV.FIREBASE_PROJECT_ID,
  ADMIN_EMAIL: E2E_FIREBASE_ADMIN_ENV.ADMIN_EMAIL,
  FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
  FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR_HOST,
  NEXT_PUBLIC_FIREBASE_API_KEY: E2E_PUBLIC_API_KEY,
  PROFISSIONAL_UNICO_NOME: E2E_PROFISSIONAL,
} as const;

/**
 * Tudo que o seed de E2E (`tests/e2e/fixtures/adminSeed.ts`) precisa para falar
 * com o servidor emulado e com a Emulator Suite.
 *
 * Exportado daqui, e não redeclarado no fixture, porque é a MESMA configuração
 * que sobe o servidor: uma cópia divergiria em silêncio no primeiro rename de
 * porta ou de e-mail do administrador.
 *
 * As variáveis `*_EMULATOR_HOST` viajam como **origens HTTP** e nunca são
 * escritas em `process.env` do runner: o CT-21 assere que o processo de teste
 * está fora do modo emulador, e contaminá-lo invalidaria aquele cenário.
 */
export const E2E_EMULATED_SERVER = {
  /**
   * `localhost`, e não `127.0.0.1`: o cookie de sessão é emitido com `Secure`
   * (o servidor roda em modo produção), e o `APIRequestContext` do Playwright só
   * envia cookie `Secure` por http quando o host é `localhost` — para o IP
   * literal ele o descarta. Sem isso, uma requisição autenticada feita por
   * `page.request` chegaria anônima e o CT-14 leria o redirecionamento da borda
   * como se fosse ausência de rota.
   */
  baseURL: `http://localhost:${EMULATED_PORT}`,
  projectId: E2E_FIREBASE_ADMIN_ENV.FIREBASE_PROJECT_ID,
  adminEmail: E2E_FIREBASE_ADMIN_ENV.ADMIN_EMAIL,
  adminPassword: E2E_ADMIN_PASSWORD,
  authEmulatorOrigin: `http://${AUTH_EMULATOR_HOST}`,
  firestoreEmulatorOrigin: `http://${FIRESTORE_EMULATOR_HOST}`,
  apiKey: E2E_PUBLIC_API_KEY,
  profissional: E2E_PROFISSIONAL,
} as const;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sem auto-retry: retry sem telemetria esconde bug real (antipadrão `retry_as_fix`).
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Os três sobem em SEQUÊNCIA, na ordem declarada (o Playwright registra um
  // plugin por entrada e executa o setup de cada um antes do próximo). É o que
  // permite ao terceiro servidor reaproveitar o build produzido pelo segundo.
  webServer: [
    {
      // Emulator Suite: Auth emite/verifica o cookie de sessão do administrador
      // e Firestore recebe o seed das telas administrativas.
      command:
        `npx firebase emulators:start --only auth,firestore ` +
        `--project ${E2E_FIREBASE_ADMIN_ENV.FIREBASE_PROJECT_ID}`,
      // Espera pelo emulador de Auth de propósito: `firebase emulators:start`
      // sobe o Firestore ANTES do Auth, então o Auth respondendo significa que
      // os dois estão de pé — e o seed usa os dois.
      url: `http://${AUTH_EMULATOR_HOST}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Sem isto o Playwright encerra a suíte com SIGKILL no grupo do processo —
      // e o emulador do Firestore roda em um processo Java que o firebase-tools
      // cria DESTACADO (grupo próprio). Ele sobreviveria ao SIGKILL, seguiria
      // ocupando a porta 8080 e a execução seguinte falharia com "port taken".
      // Com SIGTERM, o firebase-tools recebe o sinal, desliga os emuladores que
      // criou e libera as portas.
      gracefulShutdown: { signal: "SIGTERM", timeout: 30_000 },
    },
    {
      command: `npm run build && npx next start --port ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Firebase Admin configurado (credencial descartável) para que a recusa de
      // um cookie de sessão venha da verificação, e não de configuração ausente.
      // A chave pública entra só aqui, no build: ela é inlinada por `next build`
      // e o servidor emulado (que faz login de verdade) precisa dela no bundle.
      // `E2E_FIREBASE_ADMIN_ENV` permanece intacta — é contrato do CT-21.
      env: { ...E2E_FIREBASE_ADMIN_ENV, NEXT_PUBLIC_FIREBASE_API_KEY: E2E_PUBLIC_API_KEY },
    },
    {
      // Sem `npm run build`: reaproveita o build da entrada anterior. Um segundo
      // build rodaria sobre o mesmo `.next` que o servidor acima já está
      // servindo.
      command: `npx next start --port ${EMULATED_PORT}`,
      url: E2E_EMULATED_SERVER.baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: E2E_EMULATED_ENV,
    },
  ],
});
