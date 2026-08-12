import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/src/features/admin/sessionCookie";

/**
 * Checagem otimista de borda — roda em TODAS as rotas.
 *
 * Papel: o Proxy roda antes do roteamento, então nenhuma requisição bloqueada
 * aqui alcança código de rota nem o Firestore (CA-16). Bloqueia dois grupos:
 *
 * 1. Qualquer pathname sob `/admin` (exceto o login), a superfície de leitura.
 * 2. Qualquer **despacho de Server Action** (`POST` com header `Next-Action`)
 *    endereçado a qualquer rota que não seja a vitrine pública `/`. É por isso
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
 * Exceção do item 2 (a exceção anunciada quando o fluxo público ainda não
 * existia): a vitrine `/` despacha as duas Server Actions públicas — consultar
 * disponibilidade e solicitar horário (`src/features/agendamentos/publicActions.ts`,
 * tech_spec §3.1) —, que são anônimas por definição. Sem esta exceção o bloqueio
 * por ausência de sessão as pegaria também, e o fluxo público ficaria inacessível
 * pela UI real (a troca de data e a submissão do formulário viram redirect para o
 * login).
 *
 * Por que a exceção é por PATHNAME e não por action: o header `Next-Action`
 * carrega um id opaco gerado no build, que a borda não sabe mapear para uma
 * função — não há como distinguir aqui "action pública" de "action
 * administrativa". A exceção então é a mais estreita que a borda consegue
 * expressar: `/` exatamente, a única rota pública que despacha action. Qualquer
 * outro pathname (inclusive `/admin`, checado antes) continua bloqueado.
 *
 * Por que isso NÃO abre a superfície administrativa: liberar `/` significa que um
 * POST endereçado a `/` com o id de uma action administrativa alcança o handler —
 * exatamente o que já acontecia com o cookie presente, e o motivo de a
 * autorização nunca ter morado aqui. Toda action administrativa nasce de
 * `adminAction()`, que chama `assertAdminSession()` antes do corpo do handler
 * (`src/features/admin/actions.ts`): sem sessão válida, ela redireciona para o
 * login sem executar nada.
 */

const LOGIN_PATH = "/admin/login";
const ADMIN_PATH = "/admin";
/** Vitrine pública — única rota que despacha Server Action sem sessão. */
const PUBLIC_ACTION_PATH = "/";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // O login é a única superfície administrativa pública — inclusive para a
  // Server Action que autentica, que por definição roda sem cookie. Sem esta
  // exceção o redirecionamento apontaria para a rota que ele mesmo bloqueia.
  const isLoginRoute =
    pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);

  if (isLoginRoute || request.cookies.has(ADMIN_SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const isAdminRoute =
    pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
  const isServerActionDispatch =
    request.method === "POST" && request.headers.has("Next-Action");
  // Comparação exata: `startsWith("/")` valeria para todo pathname e anularia o
  // bloqueio inteiro. Nenhuma sub-rota herda a exceção.
  const isPublicActionRoute = pathname === PUBLIC_ACTION_PATH;

  // `isAdminRoute` primeiro e a exceção só sobre o despacho: uma rota `/admin`
  // continua bloqueada mesmo sem header, e a liberação vale só para `/`.
  if (isAdminRoute || (isServerActionDispatch && !isPublicActionRoute)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl.origin));
  }

  // Rotas públicas seguem intactas: o matcher é amplo, o bloqueio é direcionado.
  return NextResponse.next();
}

export const config = {
  // Amplo de propósito (ver item 2 acima). Exclui só o que nunca carrega sessão
  // nem despacha action — artefatos de build e ícone —, seguindo o padrão de
  // matcher negativo do guia local (`01-app/01-getting-started/16-proxy.md` e
  // `01-app/03-api-reference/03-file-conventions/proxy.md`).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
