import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";
import { exchangeStravaCode } from "@/lib/strava";
import { STRAVA_OAUTH_STATE_COOKIE, STRAVA_RETURN_TO_COOKIE } from "../connect/route";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  // Where /connect was asked to send us back to (e.g. onboarding wants /feed instead of the
  // default /profile) — validated as a same-origin relative path when it was first set.
  const returnTo = req.cookies.get(STRAVA_RETURN_TO_COOKIE)?.value || "/profile";
  const redirectTo = (status: string) => {
    const url = new URL(returnTo, req.url);
    url.searchParams.set("strava", status);
    return url;
  };

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(redirectTo("error"));
  }

  // CSRF: the state we set in /connect must round-trip back unchanged. A callback without a
  // matching state cookie is a forged/cross-site attempt to link an account and is rejected.
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STRAVA_OAUTH_STATE_COOKIE)?.value;
  const clearState = (res: NextResponse) => {
    res.cookies.delete(STRAVA_OAUTH_STATE_COOKIE);
    res.cookies.delete(STRAVA_RETURN_TO_COOKIE);
    return res;
  };
  if (!state || !expectedState || state !== expectedState) {
    return clearState(NextResponse.redirect(redirectTo("error")));
  }

  await connectDB();
  const me = await User.findById(userId);
  if (!me) return clearState(NextResponse.redirect(new URL("/sign-in", req.url)));

  try {
    const tokenData = await exchangeStravaCode(code);
    if (!tokenData.athlete?.id) throw new Error("Strava token response missing athlete id");
    const athleteId = String(tokenData.athlete.id);

    // One Strava athlete → one ICHOR account. If this athlete is already linked elsewhere, refuse
    // rather than silently create a duplicate link (the DB unique index would also reject it).
    const existing = await User.findOne({ stravaAthleteId: athleteId }).select("_id").lean();
    if (existing && String((existing as { _id: unknown })._id) !== String(me._id)) {
      return clearState(NextResponse.redirect(redirectTo("already-linked")));
    }

    me.stravaAthleteId = athleteId;
    me.stravaAccessToken = tokenData.access_token;
    me.stravaRefreshToken = tokenData.refresh_token;
    me.stravaTokenExpiresAt = new Date(tokenData.expires_at * 1000);
    me.stravaConnectedAt = new Date();
    await me.save();
    // No history import — only activities recorded on Strava from this point forward will
    // sync in, delivered by the webhook (app/api/integrations/strava/webhook/route.ts).
  } catch (err) {
    console.error("[strava/callback] failed:", err);
    return clearState(NextResponse.redirect(redirectTo("error")));
  }

  return clearState(NextResponse.redirect(redirectTo("connected")));
}
