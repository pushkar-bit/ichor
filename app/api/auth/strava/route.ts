import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// "Sign in with Strava" — distinct from app/api/integrations/strava/connect/route.ts, which
// requires an existing ichor session and links Strava to it. This one has no session check on
// purpose: it's the entry point for someone who isn't logged in yet, authenticating via Strava
// itself (app/api/auth/strava/callback/route.ts finds-or-creates the ichor account).
export const STRAVA_LOGIN_STATE_COOKIE = "strava_login_oauth_state";

export async function GET(req: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Strava isn't configured" }, { status: 500 });
  }

  const redirectUri = new URL("/api/auth/strava/callback", req.url).toString();

  // Same CSRF pattern as the connect flow, but its own cookie name — the two flows (login vs.
  // link-to-existing-account) must never be able to cross-validate each other's state.
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  // Same scope the connect flow uses — since a Strava-first signup stores these tokens
  // immediately (see the callback), logging in this way also means "connected" from the start.
  authorizeUrl.searchParams.set("scope", "activity:read_all");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(STRAVA_LOGIN_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
