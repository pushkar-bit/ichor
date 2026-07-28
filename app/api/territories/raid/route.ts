import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { raidTerritory } from "@/lib/raids";
import "@/models/User";

/**
 * Launches a raid — the instant, low-ceremony attack. Resolves inside this request: the
 * response already says whether the land moved.
 *
 * The client sends only which run and which territory; coverage, freshness, cooldowns and
 * the pace comparison are all re-derived server-side from the stored route (see lib/raids.ts).
 */
export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { workoutId, territoryId } = await req.json();
  if (!workoutId || !territoryId) {
    return NextResponse.json({ error: "workoutId and territoryId are required" }, { status: 400 });
  }

  const outcome = await raidTerritory({
    raider: { _id: me._id, name: me.name },
    workoutId: String(workoutId),
    territoryId: String(territoryId),
  });

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error, suggestBattle: outcome.suggestBattle ?? false }, { status: 400 });
  }
  return NextResponse.json(outcome);
}
