/**
 * Peças de configuração comuns às duas suítes Vitest (`vitest.config.mts` para
 * unit/componente e `vitest.integration.config.mts` para o Firestore Emulator).
 *
 * Existe para não manter duas cópias do mesmo plugin: o stub abaixo é
 * infraestrutura de resolução de módulo, não decisão de suíte, e duas cópias
 * divergem em silêncio na primeira vez que uma delas é ajustada.
 */

/**
 * `server-only` é resolvido por alias interno do bundler do Next e NÃO existe em
 * `node_modules` — repositories e services importam esse módulo como guarda de
 * bundle, então sem o stub qualquer teste de módulo server-side falharia na
 * resolução do import. O módulo real não tem comportamento em runtime.
 */
export const stubServerOnly = {
  name: "crosshill:stub-server-only",
  resolveId(id: string) {
    return id === "server-only" ? "\0crosshill:server-only" : null;
  },
  load(id: string) {
    return id === "\0crosshill:server-only" ? "export {};" : null;
  },
} as const;
