import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { AppError } from "@/src/shared/errors";

/**
 * Inicialização do Firebase Admin (server-side).
 *
 * `server-only` garante erro de build caso um Client Component importe este
 * módulo — é o que impede a chave de serviço de vazar para o bundle do browser.
 * Nenhum componente de UI fala com o SDK: repositories e services consomem
 * `getFirestoreAdmin()`.
 *
 * A leitura de `process.env` é preguiçosa (dentro das funções) de propósito:
 * importar o módulo não pode explodir em ambientes sem credenciais — por
 * exemplo durante `next build` ou nos testes de rota sem sessão.
 */

const ADMIN_APP_NAME = "crosshill-admin";

/** Devolve o `App` do Admin SDK, criando-o na primeira chamada. */
export function getFirebaseAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) {
    return existing;
  }

  try {
    return initializeApp(buildAdminOptions(), ADMIN_APP_NAME);
  } catch (error) {
    // Corrida entre dois chamadores no mesmo tick: a app já existe, reaproveite.
    if (getApps().some((app) => app.name === ADMIN_APP_NAME)) {
      return getApp(ADMIN_APP_NAME);
    }

    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.", {
      cause: error,
    });
  }
}

/** Firestore administrativo — única porta de escrita/leitura privilegiada. */
export function getFirestoreAdmin(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

function buildAdminOptions(): { credential?: ReturnType<typeof cert>; projectId: string } {
  const projectId = requireEnv("FIREBASE_PROJECT_ID");

  // Com emulador não existe (nem deve existir) chave de serviço.
  if (isUsingEmulators()) {
    return { projectId };
  }

  return {
    projectId,
    credential: cert({
      projectId,
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      // Em .env a chave costuma vir com `\n` literal em uma única linha.
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  };
}

function isUsingEmulators(): boolean {
  return Boolean(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ?? process.env.FIRESTORE_EMULATOR_HOST,
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Somente o NOME da variável é logado; o valor é credencial.
    console.error("[firebase-admin] configuração ausente", { missing: name });
    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.");
  }

  return value;
}
