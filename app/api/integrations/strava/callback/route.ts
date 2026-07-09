import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";
import { exchangeStravaCode } from "@/lib/strava";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/profile?strava=error", req.url));
  }

  await connectDB();
  const me = await User.findById(userId);
  if (!me) return NextResponse.redirect(new URL("/sign-in", req.url));

  try {
    const tokenData = await exchangeStravaCode(code);
    if (!tokenData.athlete?.id) throw new Error("Strava token response missing athlete id");

    me.stravaAthleteId = String(tokenData.athlete.id);
    me.stravaAccessToken = tokenData.access_token;
    me.stravaRefreshToken = tokenData.refresh_token;
    me.stravaTokenExpiresAt = new Date(tokenData.expires_at * 1000);
    me.stravaConnectedAt = new Date();
    await me.save();
    // No history import — only activities recorded on Strava from this point forward will
    // sync in, delivered by the webhook (app/api/integrations/strava/webhook/route.ts).
  } catch (err) {
    console.error("[strava/callback] failed:", err);
    return NextResponse.redirect(new URL("/profile?strava=error", req.url));
  }

  return NextResponse.redirect(new URL("/profile?strava=connected", req.url));
}
