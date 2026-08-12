import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Arquivos do framework de agentes (skills, fixtures de eval) não são
    // código do produto e usam CommonJS — ficam fora do lint da aplicação.
    ".claude/**",
    ".codex/**",
  ]),
]);

export default eslintConfig;
