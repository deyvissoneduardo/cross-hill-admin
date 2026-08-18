import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { assertAdminSession } from "@/src/features/admin/auth";
import { bookingService } from "@/src/features/agendamentos/services/bookingService";
import { googleCalendarService } from "@/src/features/google-calendar/googleCalendarService";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "crosshill_google_oauth_state";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await assertAdminSession();

  const returnUrl = new URL("/admin/agenda", request.url);
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");

  if (!state || !expectedState || !safeEquals(state, expectedState) || !code) {
    returnUrl.searchParams.set("googleCalendar", "erro_autorizacao");
    return clearStateAndRedirect(returnUrl);
  }

  try {
    await googleCalendarService.connectFromAuthorizationCode(code);
    const appointments = await bookingService.listActiveAppointments();
    for (const appointment of appointments) {
      await googleCalendarService.syncAppointment(appointment);
    }
    returnUrl.searchParams.set("googleCalendar", "vinculado");
  } catch (error) {
    console.error("[google-calendar] falha ao concluir vínculo", {
      tipo: error instanceof Error ? error.name : typeof error,
    });
    returnUrl.searchParams.set("googleCalendar", "erro");
  }

  return clearStateAndRedirect(returnUrl);
}

function clearStateAndRedirect(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
