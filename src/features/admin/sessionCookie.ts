/**
 * Nome do cookie de sessão administrativa — fonte única.
 *
 * Vive num módulo próprio, sem `server-only`, porque os dois lados da guarda
 * precisam do mesmo nome: `proxy.ts` (borda, roda antes do roteamento) e
 * `src/features/admin/auth.ts` (verificação autoritativa, `server-only`).
 * Importar `auth.ts` no Proxy arrastaria o Admin SDK e o `server-only` para a
 * borda; duplicar a string faria o rename divergir em silêncio — daí este
 * módulo neutro, que só declara a constante.
 */
export const ADMIN_SESSION_COOKIE = "crosshill_admin_session";
