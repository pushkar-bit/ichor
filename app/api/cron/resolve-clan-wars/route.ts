import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sweepClanWars } from "@/lib/clanWars";

/**
 * Resolves every clan war whose 48h window has closed — whichever clan's members ran more
 * collective km in the window wins, and its Clan.battlesWon increments. Same contract as the
 * other cron routes: CRON_SECRET bearer auth, not wired to a scheduler yet.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const resolved = await sweepClanWars();
  return NextResponse.json({ ok: true, resolved });
}
