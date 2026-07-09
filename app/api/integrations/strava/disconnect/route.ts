import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await connectDB();
  const me = await User.findById(userId);
  if (!me) return NextResponse.json({ error: "not found" }, { status: 404 });

  const accessToken = me.stravaAccessToken;
  me.stravaAthleteId = null;
  me.stravaAccessToken = null;
  me.stravaRefreshToken = null;
  me.stravaTokenExpiresAt = null;
  me.stravaConnectedAt = null;
  await me.save();

  if (accessToken) {
    // Best-effort revoke on Strava's side — don't fail the disconnect if this errors.
    fetch(`https://www.strava.com/oauth/deauthorize?access_token=${accessToken}`, { method: "POST" }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
