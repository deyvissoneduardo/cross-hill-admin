import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";
import { AppError } from "@/src/shared/errors";
import type { GoogleCalendarConnection } from "@/src/features/google-calendar/types";

type StoredConnection = {
  refreshTokenCiphertext: string;
  refreshTokenIv: string;
  refreshTokenTag: string;
  calendarId: string;
  connectedAt: string;
};

export const googleCalendarRepository = {
  async read(): Promise<GoogleCalendarConnection | null> {
    const snapshot = await getFirestoreAdmin()
      .doc(firestorePaths.configuracaoGoogleCalendar())
      .get();

    if (!snapshot.exists) return null;

    const data = snapshot.data() as Partial<StoredConnection> | undefined;
    if (
      !data?.refreshTokenCiphertext ||
      !data.refreshTokenIv ||
      !data.refreshTokenTag ||
      !data.calendarId ||
      !data.connectedAt
    ) {
      throw new AppError("unavailable", "Integração com Google Calendar inválida.");
    }

    const stored: StoredConnection = {
      refreshTokenCiphertext: data.refreshTokenCiphertext,
      refreshTokenIv: data.refreshTokenIv,
      refreshTokenTag: data.refreshTokenTag,
      calendarId: data.calendarId,
      connectedAt: data.connectedAt,
    };

    return {
      refreshToken: decryptToken(stored),
      calendarId: data.calendarId,
      connectedAt: data.connectedAt,
    };
  },

  async save(refreshToken: string, now: Date = new Date()): Promise<void> {
    const encrypted = encryptToken(refreshToken);
    await getFirestoreAdmin()
      .doc(firestorePaths.configuracaoGoogleCalendar())
      .set({
        ...encrypted,
        calendarId: "primary",
        connectedAt: now.toISOString(),
      } satisfies StoredConnection);
  },
} as const;

function encryptionKey(): Buffer {
  const encoded = process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY;
  const key = encoded ? Buffer.from(encoded, "base64") : Buffer.alloc(0);
  if (key.length !== 32) {
    console.error("[google-calendar] chave de criptografia ausente ou inválida");
    throw new AppError("unavailable", "Integração com Google Calendar indisponível.");
  }
  return key;
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    refreshTokenCiphertext: ciphertext.toString("base64"),
    refreshTokenIv: iv.toString("base64"),
    refreshTokenTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptToken(data: StoredConnection): string {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(data.refreshTokenIv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(data.refreshTokenTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(data.refreshTokenCiphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (cause) {
    throw new AppError("unavailable", "Integração com Google Calendar inválida.", {
      cause,
    });
  }
}
