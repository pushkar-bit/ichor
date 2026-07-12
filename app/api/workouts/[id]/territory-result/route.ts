import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Workout } from "@/models/Workout";
import { Territory } from "@/models/Territory";
import { Battle } from "@/models/Battle";
import { isTerritoryEligibleRun, ATTACK_COVERAGE_THRESHOLD } from "@/lib/territoryEngine";
import { buildRunCorridor, coverageRatio, bboxesIntersect, type TerritoryGeometry, type Bbox } from "@/lib/geo";

/**
 * The post-run prompt's data: what this run claimed and which territories it can attack.
 * Recomputed from the stored route so it works for both the live post flow and a
 * notification tap-through hours later (opportunities themselves expire at 24h,
 * enforced at battle-creation time).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const workout: any = await Workout.findOne({ _id: id, userId: me._id }).lean();
  if (!workout) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!isTerritoryEligibleRun(workout)) {
    return NextResponse.json({ claimed: null, opportunities: [], eligible: false });
  }

  const corridor = buildRunCorridor(workout.route.coordinates);
  if (!corridor) return NextResponse.json({ claimed: null, opportunities: [], eligible: false });

  const myId = String(me._id);
  const candidates: any[] = await Territory.find({
    "bbox.0": { $lte: corridor.bbox[2] },
    "bbox.2": { $gte: corridor.bbox[0] },
  })
    .populate("ownerId", "name avatarUrl")
    .lean();

  const claimed = candidates.find((t) => String(t.claimRunId) === String(workout._id)) ?? null;

  const now = new Date();
  const opportunities = [];
  for (const t of candidates) {
    if (!bboxesIntersect(t.bbox as Bbox, corridor.bbox)) continue;
    const ownerId = t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null;
    if (!ownerId || ownerId === myId) continue;
    if (t.shieldUntil && new Date(t.shieldUntil) > now) continue;

    const coverage = coverageRatio(corridor.geometry, t.geometry as TerritoryGeometry);
    if (coverage < ATTACK_COVERAGE_THRESHOLD) continue;

    const activeBattle = await Battle.exists({ territoryId: t._id, status: { $ne: "RESOLVED" } });
    if (activeBattle) continue;

    opportunities.push({
      territoryId: String(t._id),
      territoryName: t.name,
      ownerName: t.ownerId?.name ?? null,
      ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
      coverage: Math.round(coverage * 100) / 100,
    });
  }

  const runAgeHours = (Date.now() - new Date(workout.workoutDate).getTime()) / 3600e3;
  return NextResponse.json({
    eligible: true,
    attackWindowOpen: runAgeHours <= 24,
    claimed: claimed
      ? { territoryId: String(claimed._id), name: claimed.name, areaSqM: claimed.areaSqM, valuePoints: claimed.valuePoints }
      : null,
    opportunities,
  });
}
