import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";
import { Territory } from "@/models/Territory";
import "@/models/Workout"; // registers the model the Post.populate below resolves against
import "@/models/User";
import { isTerritoryEligibleRun, FAME_MIN_COVERAGE } from "@/lib/territoryEngine";
import {
  buildRunCorridor,
  coverageRatio,
  bboxesIntersect,
  simplifyForDisplay,
  type Bbox,
  type TerritoryGeometry,
} from "@/lib/geo";

/**
 * Backfills `Post.territorySnapshot` for runs that predate it.
 *
 * The snapshot is written at ingest (lib/runGameplay.ts), so every post created before that
 * existed has none — which means the feed's land ribbon simply doesn't render on historical
 * runs. That's a correct graceful degradation and a bad first impression on an existing
 * database, hence this one-shot replay.
 *
 * Recomputes coverage from each workout's stored route against today's territories, the same
 * way app/api/workouts/[id]/territory-result does. It reconstructs what the run *would*
 * report now — it never re-awards points, re-claims land, or mutates a Territory.
 *
 *   npx tsx --env-file=.env scripts/backfillPostTerritory.ts
 *   npx tsx --env-file=.env scripts/backfillPostTerritory.ts --force   (redo existing snapshots)
 */

const force = process.argv.includes("--force");

type TerritoryDoc = {
  _id: unknown;
  name: string;
  ownerId: { _id?: unknown; name?: string } | null;
  geometry: TerritoryGeometry;
  bbox: Bbox;
  color: string;
  areaSqM: number;
  valuePoints: number;
  district: string | null;
  claimRunId: unknown;
};

async function main() {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (!force) query.territorySnapshot = null;

  const posts = await Post.find(query)
    .select("_id userId workoutId")
    .populate({ path: "workoutId", select: "activityType sourceType verificationStatus distanceKm avgPaceMinPerKm route" })
    .lean();

  console.log(`[backfill] ${posts.length} post(s) to consider${force ? " (--force)" : ""}`);

  // Territory count is campus-pilot scale — the same wholesale load the claim pipeline does.
  const territories = (await Territory.find({})
    .select("name ownerId geometry bbox color areaSqM valuePoints district claimRunId")
    .populate("ownerId", "name")
    .lean()) as unknown as TerritoryDoc[];

  let written = 0;
  let skipped = 0;

  for (const post of posts as unknown as { _id: unknown; userId: unknown; workoutId: unknown }[]) {
    const workout = post.workoutId as Parameters<typeof isTerritoryEligibleRun>[0] | null;
    if (!workout || !isTerritoryEligibleRun(workout)) {
      skipped++;
      continue;
    }

    const corridor = buildRunCorridor(workout.route!.coordinates);
    if (!corridor) {
      skipped++;
      continue;
    }

    const authorId = String(post.userId);
    const crossed: {
      territoryId: unknown;
      name: string;
      ownerId: unknown;
      ownerName: string | null;
      coveragePct: number;
      isRival: boolean;
    }[] = [];
    let claimed: Record<string, unknown> | null = null;
    let district: string | null = null;

    for (const t of territories) {
      if (!bboxesIntersect(t.bbox, corridor.bbox)) continue;

      // The territory this very run claimed — matched by claimRunId, exactly as the live
      // pipeline records it.
      if (String(t.claimRunId) === String((workout as { _id: unknown })._id)) {
        claimed = {
          territoryId: t._id,
          name: t.name,
          areaSqM: t.areaSqM,
          valuePoints: t.valuePoints,
          color: t.color,
          geometry: simplifyForDisplay(t.geometry),
          bbox: t.bbox,
        };
        district = district ?? t.district;
        continue;
      }

      const coverage = coverageRatio(corridor.geometry, t.geometry);
      if (coverage < FAME_MIN_COVERAGE) continue;

      const ownerId = t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null;
      crossed.push({
        territoryId: t._id,
        name: t.name,
        ownerId,
        ownerName: t.ownerId?.name ?? null,
        coveragePct: Math.round(coverage * 100),
        isRival: Boolean(ownerId) && ownerId !== authorId,
      });
      district = district ?? t.district;
    }

    if (!claimed && crossed.length === 0) {
      skipped++;
      continue;
    }

    await Post.updateOne({ _id: post._id }, { territorySnapshot: { claimed, crossed, district } });
    written++;
  }

  console.log(`[backfill] wrote ${written} snapshot(s), skipped ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[backfill] failed:", err);
  process.exit(1);
});
