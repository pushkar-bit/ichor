import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSessionUserId } from "@/lib/session";

export const STRAVA_OAUTH_STATE_COOKIE = "strava_oauth_state";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Strava isn't configured" }, { status: 500 });
  }

  // Callback domain is locked per Strava app registration, so the redirect_uri must match
  // whatever this request's own origin is (localhost in dev, the real domain in prod).
  const redirectUri = new URL("/api/integrations/strava/callback", req.url).toString();

  // CSRF protection: a random state we echo through Strava and re-check in the callback. Without
  // it, an attacker could feed a victim a callback URL bearing the attacker's own auth `code`,
  // linking the attacker's Strava account to the victim's session (account-linking CSRF).
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  authorizeUrl.searchParams.set("scope", "activity:read_all");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(STRAVA_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete the OAuth round-trip
  });
  return res;
}
