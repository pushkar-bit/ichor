import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/models/User";
import { syncRecentStravaActivities } from "@/lib/strava";

/**
 * Manual "sync now": pulls the signed-in user's recent Strava activities and ingests any that
 * aren't already synced. This is the reliable path when the push webhook can't reach us — the
 * webhook needs a public URL Strava can POST to, so on localhost / any non-public deployment
 * nothing auto-syncs. Idempotent, so it's safe to hit repeatedly.
 */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await connectDB();
  const me = await User.findById(userId);
  if (!me) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!me.stravaRefreshToken) {
    return NextResponse.json({ error: "Strava isn't connected" }, { status: 400 });
  }

  try {
    const result = await syncRecentStravaActivities(me, { sinceDays: 14 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[strava/sync] failed:", err);
    return NextResponse.json({ error: "Sync failed — try again." }, { status: 502 });
  }
}
