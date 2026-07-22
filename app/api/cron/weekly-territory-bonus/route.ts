import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { checkAndAwardWeeklyTerritoryBonuses } from "@/lib/points";

/**
 * Weekly territory-hold and territory-leaderboard bonuses — see points.md "Territory
 * rewards." Same contract as the other cron routes: CRON_SECRET bearer auth, not wired to a
 * scheduler yet; intended to run once a week (e.g. Monday 00:00) alongside rank-bonus.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const awarded = await checkAndAwardWeeklyTerritoryBonuses();
  return NextResponse.json({ ok: true, awarded });
}
