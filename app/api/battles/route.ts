import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Battle } from "@/models/Battle";
import { createBattle, sweepBattles } from "@/lib/battles";
import "@/models/User";
import "@/models/Territory";

/** Confirm an attack from a run. Coverage, freshness, and rate limits re-checked server-side. */
export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { workoutId, territoryId, proposedMetric } = await req.json();
  if (!workoutId || !territoryId || !["PACE", "DISTANCE"].includes(proposedMetric)) {
    return NextResponse.json({ error: "workoutId, territoryId and proposedMetric (PACE|DISTANCE) are required" }, { status: 400 });
  }

  const result = await createBattle({ attacker: me, workoutId, territoryId, proposedMetric });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

/**
 * My battles, fog-of-war-masked: scores/entries never serialized while a battle is live;
 * revealedStats only once RESOLVED.
 */
export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await sweepBattles({ userId: String(me._id) });

  const battles = await Battle.find({
    $or: [{ attackerId: me._id }, { defenderId: me._id }],
  })
    .sort({ createdAt: -1 })
    .limit(25)
    .populate("attackerId", "name avatarUrl")
    .populate("defenderId", "name avatarUrl")
    .populate("territoryId", "name color")
    .lean();

  const myId = String(me._id);
  return NextResponse.json({
    battles: battles.map((b: any) => {
      const iAmAttacker = String(b.attackerId?._id) === myId;
      const mySide = iAmAttacker ? "attacker" : "defender";
      const myEntry = iAmAttacker ? b.attackerEntry : b.defenderEntry;
      const theirEntry = iAmAttacker ? b.defenderEntry : b.attackerEntry;
      return {
        id: String(b._id),
        role: mySide,
        status: b.status,
        mode: b.mode,
        territory: b.territoryId ? { id: String(b.territoryId._id), name: b.territoryId.name, color: b.territoryId.color } : null,
        opponent: iAmAttacker
          ? b.defenderId && { id: String(b.defenderId._id), name: b.defenderId.name, avatarUrl: b.defenderId.avatarUrl }
          : b.attackerId && { id: String(b.attackerId._id), name: b.attackerId.name, avatarUrl: b.attackerId.avatarUrl },
        proposedMetric: b.proposedMetric,
        respondBy: b.respondBy,
        asyncMetric: b.asyncMetric,
        asyncDeadline: b.asyncDeadline,
        duelMetric: b.duelMetric,
        duelWindowStart: b.duelWindowStart,
        duelWindowEnd: b.duelWindowEnd,
        // Fog of war: you can see whether entries exist, never their numbers.
        iHaveSubmitted: Boolean(myEntry),
        opponentHasSubmitted: Boolean(theirEntry),
        // Post-resolution only:
        resolution: b.status === "RESOLVED" ? b.resolution : null,
        winnerId: b.status === "RESOLVED" && b.winnerId ? String(b.winnerId) : null,
        revealedStats: b.status === "RESOLVED" ? b.revealedStats : null,
        createdAt: b.createdAt,
        resolvedAt: b.resolvedAt,
      };
    }),
  });
}
