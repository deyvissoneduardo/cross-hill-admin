import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

import { AppError } from "@/src/shared/errors";

/**
 * Inicialização do Firebase client-side.
 *
 * Somente variáveis `NEXT_PUBLIC_*` são lidas aqui: este módulo pode ser
 * empacotado para o browser, então nenhuma credencial de serviço
 * (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`) pode ser referenciada.
 * Operações administrativas usam exclusivamente `src/firebase/admin.ts`.
 */

const CLIENT_APP_NAME = "crosshill-client";

/**
 * Devolve o `FirebaseApp` do client, criando-o na primeira chamada.
 *
 * A instância é reaproveitada por nome — em dev, o hot reload reexecuta o
 * módulo e um `initializeApp` sem guarda lançaria `duplicate-app`.
 */
export function getFirebaseClientApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === CLIENT_APP_NAME);
  if (existing) {
    return existing;
  }

  const config = readClientConfig();

  try {
    return initializeApp(config, CLIENT_APP_NAME);
  } catch (error) {
    // Corrida entre dois chamadores no mesmo tick: a app já existe, reaproveite.
    if (getApps().some((app) => app.name === CLIENT_APP_NAME)) {
      return getApp(CLIENT_APP_NAME);
    }

    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.", {
      cause: error,
    });
  }
}

function readClientConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
} {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const missing = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", projectId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    // Nome da variável ausente não é dado sensível — ajuda a diagnosticar deploy.
    console.error("[firebase-client] configuração ausente", { missing });
    throw new AppError("unavailable", "Serviço indisponível. Tente novamente.");
  }

  return {
    apiKey: apiKey as string,
    authDomain: authDomain as string,
    projectId: projectId as string,
  };
}
