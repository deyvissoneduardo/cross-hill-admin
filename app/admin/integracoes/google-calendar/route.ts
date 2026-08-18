import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { assertAdminSession } from "@/src/features/admin/auth";
import { googleCalendarService } from "@/src/features/google-calendar/googleCalendarService";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "crosshill_google_oauth_state";

export async function GET(): Promise<NextResponse> {
  await assertAdminSession();

  const state = randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(googleCalendarService.buildAuthorizationUrl(state));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin/integracoes/google-calendar/callback",
    maxAge: 10 * 60,
  });
  return response;
}
