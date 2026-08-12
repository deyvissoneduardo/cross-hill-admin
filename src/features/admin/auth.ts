import "server-only";

import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getFirebaseAdminApp } from "@/src/firebase/admin";
import { ADMIN_SESSION_COOKIE } from "@/src/features/admin/sessionCookie";
import { AppError, isAppError } from "@/src/shared/errors";

/**
 * Autenticação e autorização do administrador único.
 *
 * Decisões de segurança (tech_spec §10 e guia local
 * `node_modules/next/dist/docs/01-app/02-guides/authentication.md`):
 *
 * 1. A senha nunca chega ao JavaScript do browser nem ao Firestore: o
 *    `<form>` do login posta para uma Server Action, que troca e-mail/senha por
 *    um ID token direto no Identity Toolkit. Por isso o SDK client de auth não
 *    é usado no admin — não há token em storage acessível ao JS.
 * 2. A sessão vive em um **cookie de sessão Firebase** `httpOnly`, verificado
 *    server-side com `checkRevoked` a cada requisição. Cookie presente NÃO é
 *    autorização: quem autoriza é `getAdminSession()`.
 * 3. Autorização = o e-mail da sessão ser exatamente `ADMIN_EMAIL`. A v1 tem um
 *    único administrador, criado fora da aplicação (PRD §9), sem cadastro
 *    público, sem roles.
 * 4. Layout NÃO é fronteira de segurança (o guia local é explícito: um layout
 *    não controla se o resto da rota renderiza). Toda página chama
 *    `assertAdminSession()` e toda Server Action administrativa é criada via
 *    `adminAction()`, que aplica a guarda por construção. O `proxy.ts` é apenas
 *    a checagem otimista de borda.
 */

/** Firebase aceita até 14 dias; 5 dias limita a janela de um cookie roubado. */
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
/** Sem timeout, um Identity Toolkit lento prenderia o request do login. */
const SIGN_IN_TIMEOUT_MS = 10_000;
const IDENTITY_TOOLKIT_ORIGIN = "https://identitytoolkit.googleapis.com";
const SIGN_IN_PATH = "/v1/accounts:signInWithPassword";
/**
 * O Auth Emulator hospeda VÁRIAS APIs no mesmo host e as separa por prefixo:
 * a do Identity Toolkit fica sob o nome do serviço, não na raiz. Sem o prefixo
 * a requisição responde 404 e todo login local vira "credenciais inválidas".
 */
const EMULATOR_SERVICE_PREFIX = "/identitytoolkit.googleapis.com";

export type AdminSession = {
  uid: string;
  email: string;
};

/**
 * Por que a sessão foi recusada. Não é dado de autorização — serve só para
 * escolher a mensagem do login, e por isso indisponibilidade de infraestrutura
 * é distinguida de cookie recusado (uma o administrador não tem como resolver).
 */
type SessionRejection =
  | "sem_cookie"
  | "cookie_invalido"
  | "nao_autorizado"
  | "indisponivel";

type SessionResolution =
  | { session: AdminSession }
  | { session: null; motivo: SessionRejection };

/**
 * Predicado de autorização do administrador único — a regra de autorização
 * INTEIRA da v1, isolada como função pura para poder ser exercitada por teste
 * (é o único ponto que decide quem é administrador; ver `auth.test.ts`).
 *
 * Falha fechada por construção: só autoriza quando os DOIS lados são e-mails
 * bem formados e idênticos depois de normalizados. Assim, claim malformada
 * (`decoded.email` ausente/estranho) e `ADMIN_EMAIL` vazio ou inválido no
 * ambiente não autorizam ninguém — configuração ausente nunca vira curinga.
 */
export function isAuthorizedAdminEmail(
  sessionEmail: string,
  adminEmail: string,
): boolean {
  const sessao = normalizeEmail(sessionEmail);
  const admin = normalizeEmail(adminEmail);

  if (!isEmailShape(sessao) || !isEmailShape(admin)) {
    return false;
  }

  return sessao === admin;
}

/**
 * Verificação autoritativa da sessão, com o motivo da recusa.
 *
 * Memoizada por render pass (`cache`) porque `verifySessionCookie` com
 * `checkRevoked` faz chamada de rede — sem isso, cada componente que consulta a
 * sessão pagaria uma ida ao Firebase.
 *
 * Interna de propósito: o motivo existe para `assertAdminSession()` escolher a
 * mensagem do login; quem só precisa saber se há sessão usa `getAdminSession()`.
 */
const resolveAdminSession = cache(async (): Promise<SessionResolution> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return { session: null, motivo: "sem_cookie" };
  }

  try {
    // `true` = checkRevoked: detecta logout, senha trocada e conta desativada.
    const decoded = await getAuth(getFirebaseAdminApp()).verifySessionCookie(
      sessionCookie,
      true,
    );

    const email = normalizeEmail(decoded.email ?? "");
    if (!isAuthorizedAdminEmail(email, readAdminEmail())) {
      // Conta Firebase válida que não é a do administrador único.
      console.warn("[admin-auth] sessão recusada", { motivo: "nao_autorizado" });
      return { session: null, motivo: "nao_autorizado" };
    }

    return { session: { uid: decoded.uid, email } };
  } catch (error) {
    // Cookie expirado/revogado/forjado e configuração ausente caem aqui — mas
    // não são a mesma coisa: `unavailable` é falha nossa (credencial ausente,
    // Firebase fora), não um cookie ruim, e mandar o administrador a "sua sessão
    // expirou" o faria tentar de novo para sempre.
    // Não logamos o cookie nem o e-mail: evento sem dado sensível.
    console.warn("[admin-auth] sessão recusada", {
      motivo: isAppError(error) ? error.code : "cookie_invalido",
    });

    const indisponivel = isAppError(error) && error.code === "unavailable";
    return { session: null, motivo: indisponivel ? "indisponivel" : "cookie_invalido" };
  }
});

/** Sessão administrativa válida do request atual, ou `null`. */
export async function getAdminSession(): Promise<AdminSession | null> {
  return (await resolveAdminSession()).session;
}

/**
 * Exige sessão administrativa. Redireciona para o login quando não houver.
 *
 * É a guarda autoritativa: chame no início de toda página administrativa. Para
 * Server Actions, prefira `adminAction()` — a guarda passa a ser estrutural.
 */
export async function assertAdminSession(): Promise<AdminSession> {
  const resolucao = await resolveAdminSession();
  if (resolucao.session) {
    return resolucao.session;
  }

  redirect(loginPathParaRecusa(resolucao.motivo));
}

/**
 * Envolve uma Server Action administrativa na guarda autoritativa.
 *
 * Por que existe: uma Server Action é alcançável por `POST` direto em QUALQUER
 * rota (o App Router a resolve pelo header `Next-Action`), então a checagem de
 * borda do `proxy.ts` não é suficiente e "lembrar de chamar
 * `assertAdminSession()` na primeira linha" é convenção, não enforcement.
 * Envolvendo o handler, não existe caminho de execução dele sem sessão válida —
 * a sessão chega como primeiro argumento justamente para que o handler não tenha
 * motivo de buscá-la por conta própria.
 *
 * Uso, no módulo marcado com `"use server"`:
 * `export const confirmar = adminAction(async (session, id: string) => { ... })`
 */
export function adminAction<Args extends unknown[], Result>(
  handler: (session: AdminSession, ...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    const session = await assertAdminSession();
    return handler(session, ...args);
  };
}

/**
 * Server Action do formulário de login.
 *
 * Sempre redireciona: `/admin` no sucesso, `/admin/login?erro=...` na falha —
 * com código genérico, para não revelar se o e-mail existe. Essa garantia
 * cobre o corpo da resposta e o destino do redirect (sempre genéricos); ela
 * NÃO cobre o tempo de resposta — o curto-circuito de autorização por e-mail
 * abaixo responde mais rápido para "e-mail não é admin" do que para "e-mail
 * é admin, senha errada", uma diferença observável (oráculo de timing) que
 * este comentário não promete eliminar.
 */
export async function signInAdmin(formData: FormData): Promise<void> {
  "use server";

  let destino: string;

  try {
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const senha = String(formData.get("senha") ?? "");

    if (!isEmailShape(email) || senha.length === 0) {
      throw new AppError("unauthorized", "Credenciais inválidas.");
    }

    // Autorização antes de gastar chamada de rede: a v1 tem um único admin.
    if (!isAuthorizedAdminEmail(email, readAdminEmail())) {
      console.warn("[admin-auth] login recusado", { motivo: "nao_autorizado" });
      throw new AppError("unauthorized", "Credenciais inválidas.");
    }

    const idToken = await exchangePasswordForIdToken(email, senha);

    const sessionCookie = await getAuth(getFirebaseAdminApp()).createSessionCookie(
      idToken,
      { expiresIn: SESSION_DURATION_MS },
    );

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      // Em produção o cookie só trafega por HTTPS; em dev local (http) seria
      // descartado pelo browser.
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });

    destino = "/admin";
  } catch (error) {
    destino = `/admin/login?erro=${resolveLoginErrorCode(error)}`;
  }

  // `redirect` lança exceção de controle de fluxo: precisa ficar FORA do
  // try/catch, senão o catch a engoliria e o login nunca navegaria.
  redirect(destino);
}

/**
 * Server Action de logout: revoga a sessão no Firebase, apaga o cookie e volta
 * ao login. Idempotente — funciona mesmo sem sessão ativa.
 */
export async function signOutAdmin(): Promise<void> {
  "use server";

  const session = await getAdminSession();

  if (session) {
    try {
      // Invalida o cookie de sessão server-side; apagar o cookie no browser não
      // basta se alguém já tiver uma copia dele.
      await getAuth(getFirebaseAdminApp()).revokeRefreshTokens(session.uid);
    } catch (error) {
      // Logout não pode falhar por causa disso: o cookie é apagado de todo modo.
      console.error("[admin-auth] falha ao revogar sessão", {
        motivo: isAppError(error) ? error.code : "revogacao_falhou",
      });
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);

  redirect("/admin/login");
}

/**
 * Troca e-mail/senha por um ID token no Identity Toolkit.
 *
 * Chamada server-side de propósito: mantém a senha fora do bundle e do storage
 * do browser (tech_spec §6.3).
 */
async function exchangePasswordForIdToken(
  email: string,
  senha: string,
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("[admin-auth] configuração ausente", {
      missing: "NEXT_PUBLIC_FIREBASE_API_KEY",
    });
    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.");
  }

  const response = await fetch(buildSignInUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(SIGN_IN_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Corpo da resposta distingue EMAIL_NOT_FOUND de INVALID_PASSWORD; não
    // propagamos essa diferença para não permitir enumeração de contas.
    console.warn("[admin-auth] login recusado", {
      motivo: "credenciais_invalidas",
      status: response.status,
    });
    throw new AppError("unauthorized", "Credenciais inválidas.");
  }

  const payload: unknown = await response.json();
  const idToken =
    typeof payload === "object" && payload !== null && "idToken" in payload
      ? (payload as { idToken?: unknown }).idToken
      : undefined;

  if (typeof idToken !== "string" || idToken.length === 0) {
    console.error("[admin-auth] resposta sem idToken");
    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.");
  }

  return idToken;
}

function buildSignInUrl(apiKey: string): string {
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  // O Auth Emulator expõe a mesma API sob o próprio host (sempre http), porém
  // atrás do prefixo do serviço — ver `EMULATOR_SERVICE_PREFIX`.
  const origin = emulatorHost ? `http://${emulatorHost}` : IDENTITY_TOOLKIT_ORIGIN;
  const path = emulatorHost ? `${EMULATOR_SERVICE_PREFIX}${SIGN_IN_PATH}` : SIGN_IN_PATH;

  const url = new URL(path, origin);
  url.searchParams.set("key", apiKey);

  return url.toString();
}

/**
 * Destino do login para cada motivo de recusa. Sem cookie = nunca autenticou
 * (nada a explicar); cookie recusado = sessão expirada/revogada; indisponível =
 * falha de infraestrutura, que pede outra mensagem.
 */
function loginPathParaRecusa(motivo: SessionRejection): string {
  switch (motivo) {
    case "sem_cookie":
      return "/admin/login";
    case "indisponivel":
      return "/admin/login?erro=indisponivel";
    default:
      return "/admin/login?erro=sessao";
  }
}

function resolveLoginErrorCode(error: unknown): "credenciais" | "indisponivel" {
  if (isAppError(error) && error.code === "unavailable") {
    return "indisponivel";
  }

  if (!isAppError(error)) {
    console.error("[admin-auth] falha inesperada no login", {
      tipo: error instanceof Error ? error.name : typeof error,
    });
    return "indisponivel";
  }

  return "credenciais";
}

function readAdminEmail(): string {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  if (!adminEmail) {
    console.error("[admin-auth] configuração ausente", { missing: "ADMIN_EMAIL" });
    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.");
  }

  return adminEmail;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isEmailShape(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
