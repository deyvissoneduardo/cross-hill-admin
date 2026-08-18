import "server-only";

import { createHash } from "node:crypto";

import type { AppointmentDTO, AppointmentStatus } from "@/src/features/agendamentos/types";
import { buildWhatsAppUrl } from "@/src/features/whatsapp/whatsappService";
import { AppError } from "@/src/shared/errors";
import { toAppointmentInstant } from "@/src/shared/time";
import { googleCalendarRepository } from "@/src/features/google-calendar/googleCalendarRepository";
import type { GoogleOAuthTokens } from "@/src/features/google-calendar/types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const STATUS_PRESENTATION: Record<AppointmentStatus, { label: string; colorId: string }> = {
  aguardando_agendamento: { label: "Aguardando confirmação", colorId: "5" },
  confirmado: { label: "Confirmado", colorId: "10" },
  cancelado: { label: "Cancelado", colorId: "11" },
};

export const googleCalendarService = {
  isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_CALENDAR_CLIENT_ID &&
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
        process.env.GOOGLE_CALENDAR_REDIRECT_URI &&
        process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,
    );
  },

  async isConnected(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    return (await googleCalendarRepository.read()) !== null;
  },

  buildAuthorizationUrl(state: string): string {
    const config = readOAuthConfig();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params}`;
  },

  async connectFromAuthorizationCode(code: string): Promise<void> {
    const tokens = await exchangeAuthorizationCode(code);
    if (!tokens.refreshToken) {
      throw new AppError("unavailable", "O Google não forneceu acesso permanente.");
    }
    await googleCalendarRepository.save(tokens.refreshToken);
  },

  async syncAppointment(appointment: AppointmentDTO): Promise<void> {
    if (!this.isConfigured()) return;
    const connection = await googleCalendarRepository.read();
    if (!connection) return;

    const accessToken = await refreshAccessToken(connection.refreshToken);
    const eventId = eventIdForAppointment(appointment.id);
    const event = buildCalendarEvent(appointment);
    const baseUrl = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(connection.calendarId)}/events`;
    const update = await googleFetch(`${baseUrl}/${eventId}`, accessToken, {
      method: "PUT",
      body: JSON.stringify(event),
    }, [404]);

    if (update.status === 404) {
      await googleFetch(baseUrl, accessToken, {
        method: "POST",
        body: JSON.stringify({ id: eventId, ...event }),
      });
    }
  },
} as const;

export async function syncAppointmentBestEffort(appointment: AppointmentDTO): Promise<void> {
  try {
    await googleCalendarService.syncAppointment(appointment);
  } catch (error) {
    console.error("[google-calendar] falha ao sincronizar agendamento", {
      agendamentoId: appointment.id,
      tipo: error instanceof Error ? error.name : typeof error,
    });
  }
}

function buildCalendarEvent(appointment: AppointmentDTO) {
  const presentation = STATUS_PRESENTATION[appointment.status];
  const start = toAppointmentInstant(appointment.data, appointment.horario);
  const end = new Date(start.getTime() + eventDurationMinutes() * 60_000);
  const confirmUrl = buildWhatsAppUrl(appointment, "confirmacao");
  const cancelUrl = buildWhatsAppUrl(appointment, "cancelamento");

  return {
    summary: `[${presentation.label}] ${appointment.cliente} — ${appointment.profissional}`,
    description: [
      `Status: ${presentation.label}`,
      `Cliente: ${appointment.cliente}`,
      `Telefone: ${appointment.telefone}`,
      "",
      `Confirmar pelo WhatsApp: ${confirmUrl}`,
      `Cancelar pelo WhatsApp: ${cancelUrl}`,
    ].join("\n"),
    colorId: presentation.colorId,
    start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
    extendedProperties: { private: { crossHillAppointmentId: appointment.id } },
  };
}

function eventIdForAppointment(appointmentId: string): string {
  return createHash("sha256").update(`cross-hill:${appointmentId}`).digest("hex").slice(0, 40);
}

function eventDurationMinutes(): number {
  const parsed = Number(process.env.GOOGLE_CALENDAR_EVENT_DURATION_MINUTES ?? "60");
  return Number.isInteger(parsed) && parsed >= 5 && parsed <= 1440 ? parsed : 60;
}

async function exchangeAuthorizationCode(code: string): Promise<GoogleOAuthTokens> {
  const config = readOAuthConfig();
  return requestTokens({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const config = readOAuthConfig();
  const tokens = await requestTokens({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
  return tokens.accessToken;
}

async function requestTokens(params: Record<string, string>): Promise<GoogleOAuthTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
  const data = (await response.json()) as { access_token?: string; refresh_token?: string };
  if (!response.ok || !data.access_token) {
    throw new AppError("unavailable", "Não foi possível autorizar o Google Calendar.");
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function googleFetch(
  url: string,
  accessToken: string,
  init: RequestInit,
  acceptedStatuses: number[] = [],
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok && !acceptedStatuses.includes(response.status)) {
    throw new AppError("unavailable", "Não foi possível atualizar o Google Calendar.");
  }
  return response;
}

function readOAuthConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new AppError("unavailable", "Integração com Google Calendar não configurada.");
  }
  return { clientId, clientSecret, redirectUri };
}
