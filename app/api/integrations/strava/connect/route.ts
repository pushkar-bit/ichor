import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";

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

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  authorizeUrl.searchParams.set("scope", "activity:read_all");

  return NextResponse.redirect(authorizeUrl);
}
