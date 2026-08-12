// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * CT-21 (camada de unidade) — autorização do administrador único.
 *
 * INVARIANT: só obtém sessão administrativa quem apresenta um cookie de sessão
 * que o Admin SDK verifica com `checkRevoked` E cujo e-mail é exatamente
 * `ADMIN_EMAIL`. Configuração ausente nunca autoriza ninguém.
 * OWNING_LAYER: `unit` sobre `src/features/admin/auth.ts` — é o único ponto do
 * sistema que decide quem é administrador. O E2E (`tests/e2e/admin-security.spec.ts`)
 * cobre a borda HTTP, mas não consegue montar uma sessão Firebase *verificada*
 * sem credencial real do projeto, logo não exercita o lado positivo do predicado.
 * REAL EXECUTION BOUNDARY: `firebase-admin/auth` é dublado porque é rede; o
 * último bloco deste arquivo usa o verificador REAL do Admin SDK (offline) para
 * provar que um cookie forjado é recusado pela verificação, e não por
 * configuração ausente.
 *
 * Setup (caminho legítimo): a sessão é montada pelos mesmos contratos da
 * produção — cookie store do `next/headers` devolvendo o cookie e
 * `verifySessionCookie` resolvendo uma claim decodificada. Nenhum símbolo de
 * produção existe só para o teste.
 */

const ADMIN_SESSION_COOKIE = "crosshill_admin_session";
const ADMIN_EMAIL = "admin@crosshill.test";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

const mocks = vi.hoisted(() => {
  /** `redirect()` do Next interrompe a execução lançando — o dublê faz o mesmo. */
  class RedirectSignal extends Error {
    readonly destino: string;

    constructor(destino: string) {
      super(`NEXT_REDIRECT:${destino}`);
      this.name = "RedirectSignal";
      this.destino = destino;
    }
  }

  return {
    RedirectSignal,
    redirect: vi.fn((destino: string) => {
      throw new RedirectSignal(destino);
    }),
    verifySessionCookie: vi.fn(),
    createSessionCookie: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    cookieStore: {
      get: vi.fn(),
      has: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    verifySessionCookie: mocks.verifySessionCookie,
    createSessionCookie: mocks.createSessionCookie,
    revokeRefreshTokens: mocks.revokeRefreshTokens,
  })),
}));

vi.mock("@/src/firebase/admin", () => ({
  getFirebaseAdminApp: vi.fn(() => ({ name: "crosshill-admin" })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mocks.cookieStore),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import {
  adminAction,
  assertAdminSession,
  getAdminSession,
  signInAdmin,
  type AdminSession,
} from "@/src/features/admin/auth";

let consoleWarn: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  semCookieDeSessao();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function comCookieDeSessao(valor: string): void {
  mocks.cookieStore.get.mockImplementation((nome: string) =>
    nome === ADMIN_SESSION_COOKIE ? { name: nome, value: valor } : undefined,
  );
  mocks.cookieStore.has.mockImplementation(
    (nome: string) => nome === ADMIN_SESSION_COOKIE,
  );
}

function semCookieDeSessao(): void {
  mocks.cookieStore.get.mockReturnValue(undefined);
  mocks.cookieStore.has.mockReturnValue(false);
}

/** Claim que o Admin SDK devolveria para um cookie de sessão válido. */
function sessaoVerificada(uid: string, email: string): void {
  mocks.verifySessionCookie.mockResolvedValue({ uid, email });
}

function formDataLogin(email: string, senha: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("senha", senha);
  return formData;
}

describe("getAdminSession — autorização do administrador único", () => {
  it("recusa sessão Firebase verificada cujo e-mail não é o do administrador", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-outra-conta", "outra.pessoa@crosshill.test");

    await expect(getAdminSession()).resolves.toBeNull();

    // O cookie FOI verificado com checkRevoked: a recusa vem da autorização.
    expect(mocks.verifySessionCookie).toHaveBeenCalledTimes(1);
    expect(mocks.verifySessionCookie).toHaveBeenCalledWith(
      "cookie-de-sessao-valido",
      true,
    );
    expect(consoleWarn).toHaveBeenCalledWith("[admin-auth] sessão recusada", {
      motivo: "nao_autorizado",
    });
  });

  it("autoriza a sessão verificada do e-mail do administrador", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-administrador", ADMIN_EMAIL);

    await expect(getAdminSession()).resolves.toEqual({
      uid: "uid-administrador",
      email: ADMIN_EMAIL,
    });

    expect(mocks.verifySessionCookie).toHaveBeenCalledWith(
      "cookie-de-sessao-valido",
      true,
    );
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("compara e-mails normalizados (caixa e espaços não criam nem barram acesso)", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-administrador", "  Admin@CrossHill.Test  ");
    vi.stubEnv("ADMIN_EMAIL", " ADMIN@crosshill.TEST ");

    await expect(getAdminSession()).resolves.toEqual({
      uid: "uid-administrador",
      email: ADMIN_EMAIL,
    });
  });

  it("não autoriza ninguém quando ADMIN_EMAIL não está configurado", async () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-administrador", ADMIN_EMAIL);

    await expect(getAdminSession()).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalledWith("[admin-auth] configuração ausente", {
      missing: "ADMIN_EMAIL",
    });
  });

  it("não autoriza sessão verificada sem claim de e-mail", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    mocks.verifySessionCookie.mockResolvedValue({ uid: "uid-sem-email" });

    await expect(getAdminSession()).resolves.toBeNull();
    expect(consoleWarn).toHaveBeenCalledWith("[admin-auth] sessão recusada", {
      motivo: "nao_autorizado",
    });
  });

  it("recusa cookie que a verificação do Firebase rejeita", async () => {
    comCookieDeSessao("cookie-forjado");
    mocks.verifySessionCookie.mockRejectedValue(
      Object.assign(new Error("Decoding Firebase session cookie failed."), {
        code: "auth/argument-error",
      }),
    );

    await expect(getAdminSession()).resolves.toBeNull();
    expect(consoleWarn).toHaveBeenCalledWith("[admin-auth] sessão recusada", {
      motivo: "cookie_invalido",
    });
  });

  it("sem cookie de sessão não consulta o Firebase", async () => {
    await expect(getAdminSession()).resolves.toBeNull();
    expect(mocks.verifySessionCookie).not.toHaveBeenCalled();
  });
});

describe("assertAdminSession — guarda autoritativa", () => {
  it("redireciona ao login quando a sessão verificada não é a do administrador", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-outra-conta", "outra.pessoa@crosshill.test");

    await expect(assertAdminSession()).rejects.toThrow(mocks.RedirectSignal);

    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login?erro=sessao");
  });

  it("devolve a sessão do administrador sem redirecionar", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-administrador", ADMIN_EMAIL);

    await expect(assertAdminSession()).resolves.toEqual({
      uid: "uid-administrador",
      email: ADMIN_EMAIL,
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redireciona sem código de erro quando não há cookie de sessão", async () => {
    await expect(assertAdminSession()).rejects.toThrow(mocks.RedirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("distingue indisponibilidade de infraestrutura de cookie inválido", async () => {
    // Cookie presente e verificável, mas a configuração do admin não existe: é
    // falha nossa, não sessão expirada — a mensagem do login precisa diferir.
    vi.stubEnv("ADMIN_EMAIL", undefined);
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-administrador", ADMIN_EMAIL);

    await expect(assertAdminSession()).rejects.toThrow(mocks.RedirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login?erro=indisponivel");
  });

  it("redireciona com `erro=sessao` quando o cookie é recusado pela verificação", async () => {
    comCookieDeSessao("cookie-forjado");
    mocks.verifySessionCookie.mockRejectedValue(
      Object.assign(new Error("Decoding Firebase session cookie failed."), {
        code: "auth/argument-error",
      }),
    );

    await expect(assertAdminSession()).rejects.toThrow(mocks.RedirectSignal);

    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login?erro=sessao");
  });
});

describe("adminAction — guarda estrutural das Server Actions administrativas", () => {
  it("não executa o handler sem sessão administrativa", async () => {
    const handler = vi.fn(async (_session: AdminSession, id: string) => `ok:${id}`);
    const acao = adminAction(handler);

    await expect(acao("agendamento-1")).rejects.toThrow(mocks.RedirectSignal);

    expect(handler).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("não executa o handler quando a sessão verificada não é a do administrador", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-outra-conta", "outra.pessoa@crosshill.test");
    const handler = vi.fn(async (_session: AdminSession, id: string) => `ok:${id}`);

    await expect(adminAction(handler)("agendamento-1")).rejects.toThrow(
      mocks.RedirectSignal,
    );

    expect(handler).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login?erro=sessao");
  });

  it("executa o handler com a sessão do administrador e devolve o resultado", async () => {
    comCookieDeSessao("cookie-de-sessao-valido");
    sessaoVerificada("uid-administrador", ADMIN_EMAIL);
    const handler = vi.fn(async (_session: AdminSession, id: string) => `ok:${id}`);

    await expect(adminAction(handler)("agendamento-1")).resolves.toBe(
      "ok:agendamento-1",
    );

    expect(handler).toHaveBeenCalledWith(
      { uid: "uid-administrador", email: ADMIN_EMAIL },
      "agendamento-1",
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("signInAdmin — autorização antes da rede", () => {
  const API_KEY = "chave-web-de-teste";

  function stubFetch(idToken = "id-token-do-identity-toolkit") {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ idToken }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", API_KEY);
  });

  it("recusa e-mail que não é o do administrador sem chamar o Identity Toolkit", async () => {
    const fetchMock = stubFetch();

    await expect(
      signInAdmin(formDataLogin("outra.pessoa@crosshill.test", "senha-correta")),
    ).rejects.toThrow(mocks.RedirectSignal);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.createSessionCookie).not.toHaveBeenCalled();
    expect(mocks.cookieStore.set).not.toHaveBeenCalled();
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login?erro=credenciais");
    expect(consoleWarn).toHaveBeenCalledWith("[admin-auth] login recusado", {
      motivo: "nao_autorizado",
    });
  });

  it("troca a senha do administrador por cookie de sessão httpOnly", async () => {
    const fetchMock = stubFetch("id-token-do-identity-toolkit");
    mocks.createSessionCookie.mockResolvedValue("cookie-de-sessao-emitido");

    await expect(
      signInAdmin(formDataLogin(ADMIN_EMAIL, "senha-do-admin")),
    ).rejects.toThrow(mocks.RedirectSignal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      email: ADMIN_EMAIL,
      password: "senha-do-admin",
      returnSecureToken: true,
    });

    expect(mocks.createSessionCookie).toHaveBeenCalledWith(
      "id-token-do-identity-toolkit",
      { expiresIn: SESSION_DURATION_MS },
    );
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      ADMIN_SESSION_COOKIE,
      "cookie-de-sessao-emitido",
      {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_DURATION_MS / 1000,
      },
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("marca o cookie como secure em produção", async () => {
    stubFetch();
    mocks.createSessionCookie.mockResolvedValue("cookie-de-sessao-emitido");
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      signInAdmin(formDataLogin(ADMIN_EMAIL, "senha-do-admin")),
    ).rejects.toThrow(mocks.RedirectSignal);

    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      ADMIN_SESSION_COOKIE,
      "cookie-de-sessao-emitido",
      expect.objectContaining({ httpOnly: true, secure: true }),
    );
  });
});

describe("verificação de cookie de sessão no Admin SDK (fronteira real)", () => {
  /**
   * Por que este teste existe: o cenário E2E do cookie forjado só observa "o
   * usuário continua no login", desfecho idêntico ao de credencial ausente no
   * ambiente. Aqui o verificador REAL do `firebase-admin` é exercitado (roda
   * offline: a decodificação falha antes de qualquer chamada de rede), provando
   * que um cookie forjado é recusado PELA VERIFICAÇÃO — a precondição que o E2E
   * não consegue provar sem credencial real do projeto.
   */
  it("rejeita cookie de sessão forjado com erro de argumento", async () => {
    const { initializeApp, deleteApp } = await vi.importActual<
      typeof import("firebase-admin/app")
    >("firebase-admin/app");
    const { getAuth } = await vi.importActual<typeof import("firebase-admin/auth")>(
      "firebase-admin/auth",
    );

    const app = initializeApp(
      { projectId: "demo-crosshill-verificacao" },
      "crosshill-teste-verificacao",
    );

    try {
      await expect(
        getAuth(app).verifySessionCookie("cookie-forjado", true),
      ).rejects.toMatchObject({ code: "auth/argument-error" });
    } finally {
      await deleteApp(app);
    }
  });
});
