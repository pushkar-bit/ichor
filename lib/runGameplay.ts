import { Workout } from "@/models/Workout";
import { Post } from "@/models/Post";
import { processRunForTerritory, type TerritoryRunResult } from "./territoryEngine";
import { attachQualifyingRunsToBattles } from "./battles";
import { awardPointsForWorkout } from "./points";
import { findActiveGroupRunForUser, attachRunToGroupRun } from "./groupRun";
import { resolveObjectiveForRun } from "./objectives";

type GameplayUser = { _id: unknown; name?: string };
type GameplayWorkout = {
  _id: unknown;
  activityType: string;
  sourceType: string;
  verificationStatus: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  workoutDate: Date;
  route?: { type: string; coordinates: [number, number][] } | null;
};

/**
 * Territory claim + points + battle auto-attach + group-run auto-attach for one workout — the
 * gameplay layer built on top of a Post, shared by the Strava ingest path (lib/strava.ts) and
 * the manual post route (app/api/posts/route.ts) so the two never drift out of sync.
 *
 * Marks Workout.gameplayProcessedAt on success. Both callers run this in a try/catch and never
 * let a failure here block or invalidate the Post that was already created — but leaving that
 * marker null on failure is what lets the repair sweep (lib/strava.ts's
 * repairMissingStravaPosts) find and retry exactly the runs that need it, instead of either
 * silently leaving them un-gamified forever or blindly re-running gameplay for every run.
 */
export async function runGameplayPipeline(
  user: GameplayUser,
  workout: GameplayWorkout,
  opts: { notifyOpportunities?: boolean } = {},
) {
  const [territoryResult, pointsAwarded] = await Promise.all([
    processRunForTerritory({ _id: user._id, name: user.name }, workout, {
      notifyOpportunities: opts.notifyOpportunities ?? false,
    }),
    awardPointsForWorkout(user, workout),
  ]);
  // If this run lands inside an active battle the user is fighting, it becomes their entry.
  await attachQualifyingRunsToBattles(user, workout);

  // If this run lands inside a War group run's capture window and the user is still waiting
  // on a run for it, this is that run.
  const activeGroupRun = await findActiveGroupRunForUser(String(user._id), workout.workoutDate);
  if (activeGroupRun) {
    await attachRunToGroupRun(String(activeGroupRun._id), String(user._id), String(workout._id));
  }

  // Did this run deliver the ground the runner said they were going for?
  const objectiveCompleted = await resolveObjectiveForRun(String(user._id), workout._id, territoryResult);

  // Freeze what this run did to the map onto its Post, so the feed can render land without a
  // turf calculation or a Territory read per card. Both ingest paths create the Post before
  // calling this, and Post.workoutId is unique, so keying off the workout is unambiguous.
  await writeTerritorySnapshot(workout._id, territoryResult);

  await Workout.updateOne({ _id: workout._id }, { gameplayProcessedAt: new Date() });
  return { territoryResult, pointsAwarded, objectiveCompleted };
}

/**
 * Best-effort: a missing snapshot costs a feed card its map, which is a visual regression,
 * not a correctness one — it must never take down an ingest that otherwise succeeded.
 */
async function writeTerritorySnapshot(workoutId: unknown, result: TerritoryRunResult) {
  if (!result.claimed && result.crossed.length === 0) return;
  try {
    await Post.updateOne(
      { workoutId },
      {
        territorySnapshot: {
          claimed: result.claimed
            ? {
                territoryId: result.claimed.territoryId,
                name: result.claimed.name,
                areaSqM: result.claimed.areaSqM,
                valuePoints: result.claimed.valuePoints,
                color: result.claimed.color,
                geometry: result.claimed.geometry,
                bbox: result.claimed.bbox,
              }
            : null,
          crossed: result.crossed,
          district: result.district,
        },
      },
    );
  } catch (err) {
    console.error(`[gameplay] territory snapshot write failed for workout ${workoutId}:`, (err as Error).message);
  }
}
