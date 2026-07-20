import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { checkAndAwardRankImprovements } from "@/lib/points";

/**
 * Compares each user's current Points-leaderboard position against their last snapshot and
 * pays out for any climb — see points.md "Climbing the leaderboard." Same contract as the
 * other cron routes: CRON_SECRET bearer auth, not wired to a scheduler yet.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const awarded = await checkAndAwardRankImprovements();
  return NextResponse.json({ ok: true, awarded });
}
