import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Battle } from "@/models/Battle";
import { sweepBattles } from "@/lib/battles";
import "@/models/User";
import "@/models/Territory";

/** One battle, participant-only, fog-of-war-masked until resolved. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  await sweepBattles({ userId: String(me._id) });

  const b: any = await Battle.findById(id)
    .populate("attackerId", "name avatarUrl")
    .populate("defenderId", "name avatarUrl")
    .populate("territoryId", "name color valuePoints areaSqM")
    .lean();
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });

  const myId = String(me._id);
  const iAmAttacker = String(b.attackerId?._id) === myId;
  const iAmDefender = String(b.defenderId?._id) === myId;
  if (!iAmAttacker && !iAmDefender) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const myEntry = iAmAttacker ? b.attackerEntry : b.defenderEntry;
  const theirEntry = iAmAttacker ? b.defenderEntry : b.attackerEntry;

  return NextResponse.json({
    id: String(b._id),
    role: iAmAttacker ? "attacker" : "defender",
    status: b.status,
    mode: b.mode,
    proposedMetric: b.proposedMetric,
    coverageRatio: b.coverageRatio,
    territory: b.territoryId
      ? { id: String(b.territoryId._id), name: b.territoryId.name, color: b.territoryId.color }
      : null,
    attacker: b.attackerId && { id: String(b.attackerId._id), name: b.attackerId.name, avatarUrl: b.attackerId.avatarUrl },
    defender: b.defenderId && { id: String(b.defenderId._id), name: b.defenderId.name, avatarUrl: b.defenderId.avatarUrl },
    respondBy: b.respondBy,
    asyncMetric: b.asyncMetric,
    asyncDeadline: b.asyncDeadline,
    duelMetric: b.duelMetric,
    duelWindowStart: b.duelWindowStart,
    duelWindowEnd: b.duelWindowEnd,
    iHaveSubmitted: Boolean(myEntry),
    opponentHasSubmitted: Boolean(theirEntry),
    // My own entry is mine to see; the opponent's stays hidden until resolution.
    myEntry: myEntry ? { distanceKm: myEntry.distanceKm, avgPaceMinPerKm: myEntry.avgPaceMinPerKm, submittedAt: myEntry.submittedAt } : null,
    resolution: b.status === "RESOLVED" ? b.resolution : null,
    winnerId: b.status === "RESOLVED" && b.winnerId ? String(b.winnerId) : null,
    revealedStats: b.status === "RESOLVED" ? b.revealedStats : null,
    createdAt: b.createdAt,
    resolvedAt: b.resolvedAt,
  });
}
