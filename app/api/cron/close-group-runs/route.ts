import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { closeExpiredGroupRuns } from "@/lib/groupRun";

/**
 * Not wired to any scheduler yet (no vercel.json cron / Railway node-cron). Intended to be
 * hit periodically once that's set up — see AGENTS.md context on the Vercel+Railway split.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await connectDB();
  const closed = await closeExpiredGroupRuns();
  return NextResponse.json({ closed: closed.length });
}
