import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runTerritoryUpkeep } from "@/lib/territoryUpkeep";

/**
 * Daily upkeep sweep: fades quiet land, returns long-dormant land to unclaimed, and pays
 * hold-streak milestones. Same CRON_SECRET bearer contract as the other cron routes.
 *
 * Safe to run more than once a day — decay recomputes an absolute target value from the
 * territory's peak and its quiet-day count rather than subtracting a delta, and every payout
 * is ledger-guarded. See lib/territoryUpkeep.ts.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const result = await runTerritoryUpkeep();
  return NextResponse.json({ ok: true, ...result });
}
