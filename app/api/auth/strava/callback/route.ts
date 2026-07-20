import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { exchangeStravaCode } from "@/lib/strava";
import { signSession, setSessionCookie } from "@/lib/session";
import { STRAVA_LOGIN_STATE_COOKIE } from "../route";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/sign-in?error=${reason}`, req.url));
    res.cookies.delete(STRAVA_LOGIN_STATE_COOKIE);
    return res;
  };
  if (error || !code) return fail("strava");

  // CSRF: the state set in the initiate route must round-trip back unchanged.
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STRAVA_LOGIN_STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState) return fail("strava");

  try {
    await connectDB();
    const tokenData = await exchangeStravaCode(code);
    if (!tokenData.athlete?.id) throw new Error("Strava token response missing athlete id");
    const athleteId = String(tokenData.athlete.id);

    // Same field the link-only connect flow writes to (app/api/integrations/strava/callback),
    // so someone who originally signed up with Google and later connected Strava from their
    // profile can also log back in with Strava — not just brand-new Strava-first signups.
    let dbUser = await User.findOne({ stravaAthleteId: athleteId });

    if (!dbUser) {
      const name = [tokenData.athlete.firstname, tokenData.athlete.lastname].filter(Boolean).join(" ") || "New Athlete";
      dbUser = await User.create({
        stravaAthleteId: athleteId,
        name,
        avatarUrl: tokenData.athlete.profile ?? "",
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
        stravaConnectedAt: new Date(),
      });
    } else {
      dbUser.stravaAccessToken = tokenData.access_token;
      dbUser.stravaRefreshToken = tokenData.refresh_token;
      dbUser.stravaTokenExpiresAt = new Date(tokenData.expires_at * 1000);
      await dbUser.save();
    }

    const token = await signSession(String(dbUser._id));
    await setSessionCookie(token);

    const res = NextResponse.redirect(new URL("/feed", req.url));
    res.cookies.delete(STRAVA_LOGIN_STATE_COOKIE);
    return res;
  } catch (err) {
    console.error("[auth/strava] failed:", err);
    return fail("strava");
  }
}
