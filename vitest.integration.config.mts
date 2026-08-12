import { defineConfig } from "vitest/config";

// Especificador `.mjs` para o arquivo `.mts`: é a convenção de ESM em TypeScript
// (o import aponta para o módulo compilado), e é o que o carregador nativo de
// configuração do Vite resolve sem aviso.
import { stubServerOnly } from "./vitest.shared.mjs";

/**
 * Configuração dos testes de integração (Firestore real via Emulator Suite).
 *
 * Separada de `vitest.config.mts` de propósito: `npm test` precisa rodar sem
 * infraestrutura externa, e estes testes exigem o emulador de pé. Rode-os por
 * `npm run test:integration`, que sobe o emulador com `firebase emulators:exec`.
 */
export default defineConfig({
  plugins: [stubServerOnly],
  // Resolve o alias `@/*` de `tsconfig.json` nativamente (dispensa plugin).
  resolve: { tsconfigPaths: true },
  test: {
    // Sem DOM: aqui só rodam services, repositories e o SDK admin.
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Arquivos em paralelo compartilhariam o mesmo banco do emulador: a limpeza
    // de um apagaria o seed do outro.
    fileParallelism: false,
    env: {
      // O Admin SDK exige o projeto; com emulador não há credencial de serviço.
      // Prefixo `demo-` garante que nada saia para um projeto Firebase real.
      FIREBASE_PROJECT_ID: "demo-crosshill",
      // Profissional único da v1 (PRD RN-10): a solicitação pública NÃO o recebe
      // no payload — o service o resolve desta configuração. A suíte assere que o
      // agendamento gravado carrega exatamente este valor.
      PROFISSIONAL_UNICO_NOME: "Ana Souza",
    },
    // gRPC contra o emulador e transações com retry são mais lentos que unit.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
