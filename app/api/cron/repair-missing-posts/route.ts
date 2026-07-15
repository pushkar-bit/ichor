import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { repairMissingStravaPosts } from "@/lib/strava";

/**
 * Self-healing sweep for Strava-synced runs stranded with a Workout but no Post (see
 * lib/strava.ts's finishIngest/repairMissingStravaPosts for the incident this guards
 * against). Same contract as resolve-battles/close-group-runs: CRON_SECRET bearer auth,
 * not wired to a scheduler yet.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const result = await repairMissingStravaPosts();
  return NextResponse.json({ ok: true, ...result });
}
