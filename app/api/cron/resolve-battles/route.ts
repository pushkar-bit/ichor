import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sweepBattles } from "@/lib/battles";

/**
 * Sweeps every battle past its deadline (refusals-by-silence, async deadlines, duel
 * windows). Same contract as close-group-runs: CRON_SECRET bearer auth, not wired to a
 * scheduler yet — reads also sweep lazily, so this is belt-and-braces, not load-bearing.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const resolved = await sweepBattles();
  return NextResponse.json({ ok: true, resolved });
}
