import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Especificador `.mjs` para o arquivo `.mts`: é a convenção de ESM em TypeScript
// (o import aponta para o módulo compilado), e é o que o carregador nativo de
// configuração do Vite resolve sem aviso.
import { stubServerOnly } from "./vitest.shared.mjs";

export default defineConfig({
  plugins: [react(), stubServerOnly],
  // Resolve o alias `@/*` de `tsconfig.json` nativamente (dispensa plugin).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{app,src}/**/*.test.{ts,tsx}"],
    // E2E roda no Playwright (`npm run test:e2e`), nunca no Vitest.
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],
  },
});
