import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/src/features/admin/sessionCookie";

/**
 * Checagem otimista de borda — roda em TODAS as rotas.
 *
 * Papel: o Proxy roda antes do roteamento, então nenhuma requisição bloqueada
 * aqui alcança código de rota nem o Firestore (CA-16). Bloqueia dois grupos:
 *
 * 1. Qualquer pathname sob `/admin`, a superfície de leitura.
 * 2. Qualquer **despacho de Server Action** (`POST` com header `Next-Action`)
 *    endereçado a qualquer rota que não seja o login `/`. É por isso
 *    que o matcher cobre o deploy inteiro: no App Router a Server Action é
 *    resolvida pelo header, não pelo pathname — um matcher restrito a `/admin`
 *    deixaria o mesmo POST passar se endereçado a uma rota qualquer (tech_spec
 *    §10.2; guia local `01-app/02-guides/authentication.md` recomenda rodar o
 *    Proxy em todas as rotas quando o assunto é auth).
 *
 * NÃO é autorização e NÃO protege a Server Action por si só: aqui só se verifica
 * a PRESENÇA do cookie — validar exigiria ida ao Firebase em toda requisição,
 * inclusive prefetch. Quem autoriza é `assertAdminSession()`, e o enforcement
 * estrutural de toda action administrativa é o wrapper `adminAction()`
 * (`src/features/admin/auth.ts`): mesmo que este arquivo deixe um POST passar, o
 * handler não executa sem sessão válida.
 *
 * A raiz `/` é a única exceção: ela hospeda o formulário de login e sua Server
 * Action precisa, por definição, aceitar requisições sem cookie. Isso não abre
 * as ações administrativas, que continuam protegidas por `adminAction()` e
 * `assertAdminSession()` dentro dos próprios handlers.
 */

const LOGIN_PATH = "/";
const ADMIN_PATH = "/admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // O login é a única superfície pública — inclusive para a
  // Server Action que autentica, que por definição roda sem cookie. Sem esta
  // exceção o redirecionamento apontaria para a rota que ele mesmo bloqueia.
  const isLoginRoute = pathname === LOGIN_PATH;

  if (isLoginRoute || request.cookies.has(ADMIN_SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const isAdminRoute =
    pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
  const isServerActionDispatch =
    request.method === "POST" && request.headers.has("Next-Action");
  // Comparação exata: `startsWith("/")` valeria para todo pathname e anularia o
  // bloqueio inteiro. Nenhuma sub-rota herda a exceção.
  if (isAdminRoute || isServerActionDispatch) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl.origin));
  }

  // Demais requisições públicas seguem intactas.
  return NextResponse.next();
}

export const config = {
  // Amplo de propósito (ver item 2 acima). Exclui só o que nunca carrega sessão
  // nem despacha action — artefatos de build e ícone —, seguindo o padrão de
  // matcher negativo do guia local (`01-app/01-getting-started/16-proxy.md` e
  // `01-app/03-api-reference/03-file-conventions/proxy.md`).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
