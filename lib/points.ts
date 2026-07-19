import { PointsLedger, type PointReason } from "@/models/PointsLedger";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
import { getPersonalBests, FIVE_K_BAND, TEN_K_BAND } from "./personalBests";
import { isTerritoryEligibleRun } from "./territoryEngine";

/**
 * The profile-points economy. Every change goes through award(): a PointsLedger row with a
 * unique key (idempotent — replayed webhooks can't double-award) paired with a clamped
 * $inc on User.points.
 *
 * Balance intent: the PB chase is the healthiest loop, so PBs pay the most; distance
 * thresholds award the highest band only (a marathon isn't six stacked awards); pace pays
 * once per day so two easy 5Ks can't out-earn a weekly 10K PB.
 */

/** Highest band ≤ run distance wins; repeatable across runs. */
const DISTANCE_THRESHOLDS: { km: number; reason: PointReason; points: number }[] = [
  { km: 42.2, reason: "THRESHOLD_FULL", points: 600 },
  { km: 30, reason: "THRESHOLD_30K", points: 350 },
  { km: 21.1, reason: "THRESHOLD_HALF", points: 200 },
  { km: 15, reason: "THRESHOLD_15K", points: 110 },
  { km: 10, reason: "THRESHOLD_10K", points: 60 },
  { km: 5, reason: "THRESHOLD_5K", points: 25 },
];

/** Faster pace, bigger award. Only runs ≥ PACE_MIN_DISTANCE_KM, once per day. */
const PACE_BANDS: { maxPace: number; points: number }[] = [
  { maxPace: 4.0, points: 100 },
  { maxPace: 4.5, points: 75 },
  { maxPace: 5.0, points: 50 },
  { maxPace: 5.5, points: 30 },
  { maxPace: 6.0, points: 15 },
  { maxPace: 7.0, points: 8 },
  { maxPace: Infinity, points: 3 },
];
const PACE_MIN_DISTANCE_KM = 3;

export const PB_5K_POINTS = 150;
export const PB_10K_POINTS = 250;
export const PB_LONGEST_POINTS = 100;
export const DAILY_ACTIVITY_POINTS = 10;
/** Points per km, on top of the distance/PB/pace rewards above — see points.md. */
export const PER_KM_POINTS = 3;
export const TERRITORY_CLAIMED_POINTS = 200;
/** Points per km credited to a territory you own, from ANY runner's overlap — the "landlord"
 * bonus. See lib/territoryEngine.ts's bumpFame call site. */
export const TERRITORY_VALUE_GROWTH_POINTS_PER_KM = 5;
/** Fraction of the value forfeited to an attacker that becomes an extra points penalty for
 * the divided owner, on top of the existing REFUSAL_BETTER/WORSE deltas. See lib/battles.ts. */
export const OWNERSHIP_DIVIDED_PENALTY_RATE = 0.05;
export const RANK_UP_POINTS_PER_PLACE = 50;
export const RANK_UP_MAX_POINTS_PER_SWEEP = 500;

/** At most this many runs per day can earn per-run points (anti-grind). */
const DAILY_SCORING_RUN_CAP = 2;

export type PointsAward = { reason: PointReason; amount: number };

/**
 * Ledger insert + materialized User.points update. The unique index on uniqueKey makes a
 * duplicate call a no-op (the $inc is skipped on the duplicate-key error), and the
 * pipeline-$max keeps a user's points from ever going below zero.
 */
export async function award(
  userId: unknown,
  reason: PointReason,
  amount: number,
  uniqueKey: string,
  refs: { workoutId?: unknown; battleId?: unknown; territoryId?: unknown } = {},
): Promise<boolean> {
  try {
    await PointsLedger.create({
      userId,
      amount,
      reason,
      uniqueKey,
      workoutId: refs.workoutId ?? null,
      battleId: refs.battleId ?? null,
      territoryId: refs.territoryId ?? null,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false; // already awarded
    throw err;
  }
  await User.updateOne(
    { _id: userId },
    [{ $set: { points: { $max: [0, { $add: [{ $ifNull: ["$points", 0] }, amount] }] } } }],
    // Mongoose 9 requires opting in to aggregation-pipeline updates.
    { updatePipeline: true },
  );
  return true;
}

function dayKey(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

type WorkoutLike = {
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
 * All per-run awards for one workout. Idempotent per workout (uniqueKeys), gated to
 * GPS-verified runs, and capped at DAILY_SCORING_RUN_CAP scoring runs per day.
 * Returns what was awarded so the post-run UI can toast it.
 */
export async function awardPointsForWorkout(
  user: { _id: unknown },
  workout: WorkoutLike,
): Promise<PointsAward[]> {
  if (!isTerritoryEligibleRun(workout)) return [];

  const userId = user._id;
  const awards: PointsAward[] = [];

  // Daily cap: how many OTHER runs on this same day already earned points?
  const dayStart = new Date(workout.workoutDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const sameDayWorkoutIds = await Workout.find({
    userId,
    _id: { $ne: workout._id },
    workoutDate: { $gte: dayStart, $lt: dayEnd },
  })
    .select("_id")
    .lean();
  const alreadyScored = await PointsLedger.distinct("workoutId", {
    userId,
    workoutId: { $in: sameDayWorkoutIds.map((w: { _id: unknown }) => w._id) },
  });
  if (alreadyScored.length >= DAILY_SCORING_RUN_CAP) return [];

  const wk = String(workout._id);

  // 0. Daily activity — a flat "you showed up today" bonus, once per day (the uniqueKey
  //    embeds the day, so a second qualifying run the same day just no-ops).
  {
    const key = `daily:${String(userId)}:${dayKey(workout.workoutDate)}`;
    if (await award(userId, "DAILY_ACTIVITY", DAILY_ACTIVITY_POINTS, key, { workoutId: workout._id })) {
      awards.push({ reason: "DAILY_ACTIVITY", amount: DAILY_ACTIVITY_POINTS });
    }
  }

  // 1. Distance threshold — highest band only.
  const band = DISTANCE_THRESHOLDS.find((t) => workout.distanceKm >= t.km);
  if (band) {
    if (await award(userId, band.reason, band.points, `wk:${wk}:${band.reason}`, { workoutId: workout._id })) {
      awards.push({ reason: band.reason, amount: band.points });
    }
  }

  // 2. PBs — compared against every prior verified GPS run (not posts: ingest must not
  //    depend on post visibility).
  const priorRuns = await Workout.find({
    userId,
    activityType: "RUN",
    sourceType: "HEALTH_SYNC",
    verificationStatus: "VERIFIED",
    workoutDate: { $lt: workout.workoutDate },
    _id: { $ne: workout._id },
  })
    .select("activityType distanceKm avgPaceMinPerKm")
    .lean();
  const prior = getPersonalBests(priorRuns as { activityType: string; distanceKm: number; avgPaceMinPerKm: number | null }[]);

  const pace = workout.avgPaceMinPerKm;
  const in5kBand = workout.distanceKm >= FIVE_K_BAND.min && workout.distanceKm <= FIVE_K_BAND.max;
  const in10kBand = workout.distanceKm >= TEN_K_BAND.min && workout.distanceKm <= TEN_K_BAND.max;

  if (pace != null && in5kBand && (prior.best5kPaceMinPerKm === null || pace < prior.best5kPaceMinPerKm)) {
    if (await award(userId, "PB_5K", PB_5K_POINTS, `wk:${wk}:PB_5K`, { workoutId: workout._id })) {
      awards.push({ reason: "PB_5K", amount: PB_5K_POINTS });
    }
  }
  if (pace != null && in10kBand && (prior.best10kPaceMinPerKm === null || pace < prior.best10kPaceMinPerKm)) {
    if (await award(userId, "PB_10K", PB_10K_POINTS, `wk:${wk}:PB_10K`, { workoutId: workout._id })) {
      awards.push({ reason: "PB_10K", amount: PB_10K_POINTS });
    }
  }
  if (workout.distanceKm > (prior.highestDistanceKm ?? 0)) {
    if (await award(userId, "PB_LONGEST", PB_LONGEST_POINTS, `wk:${wk}:PB_LONGEST`, { workoutId: workout._id })) {
      awards.push({ reason: "PB_LONGEST", amount: PB_LONGEST_POINTS });
    }
  }

  // 3. Pace band — once per day (the uniqueKey embeds the day, so the first eligible run
  //    of the day takes it and later runs no-op).
  if (pace != null && workout.distanceKm >= PACE_MIN_DISTANCE_KM) {
    const paceBand = PACE_BANDS.find((b) => pace < b.maxPace) ?? PACE_BANDS[PACE_BANDS.length - 1];
    const key = `pace:${String(userId)}:${dayKey(workout.workoutDate)}`;
    if (await award(userId, "PACE_BAND", paceBand.points, key, { workoutId: workout._id })) {
      awards.push({ reason: "PACE_BAND", amount: paceBand.points });
    }
  }

  // 4. Per-km bonus — every kilometer of a qualifying run pays out, on top of the band/PB/
  //    pace rewards above (still inside the same DAILY_SCORING_RUN_CAP gate this whole
  //    function opened with, so it can't be farmed with many tiny runs in one day).
  const kmBonus = Math.round(workout.distanceKm * PER_KM_POINTS);
  if (kmBonus > 0 && (await award(userId, "PER_KM_BONUS", kmBonus, `wk:${wk}:PER_KM_BONUS`, { workoutId: workout._id }))) {
    awards.push({ reason: "PER_KM_BONUS", amount: kmBonus });
  }

  return awards;
}

/** Human labels for toasts/inbox — kept next to the rules so they move together. */
export const POINT_REASON_LABELS: Record<PointReason, string> = {
  THRESHOLD_5K: "5K run",
  THRESHOLD_10K: "10K run",
  THRESHOLD_15K: "15K run",
  THRESHOLD_HALF: "Half marathon",
  THRESHOLD_30K: "30K run",
  THRESHOLD_FULL: "Marathon",
  PB_5K: "New 5K personal best",
  PB_10K: "New 10K personal best",
  PB_LONGEST: "Longest run ever",
  PACE_BAND: "Pace bonus",
  DAILY_ACTIVITY: "Showed up today",
  PER_KM_BONUS: "Distance bonus",
  TERRITORY_CLAIMED: "New territory claimed",
  TERRITORY_VALUE_GROWTH: "Territory grew",
  REFUSAL_BETTER: "Territory split (stronger run)",
  REFUSAL_WORSE: "Territory split (weaker run)",
  OWNERSHIP_DIVIDED: "Territory divided",
  DUEL_DOUBLE_FORFEIT: "Duel no-show",
  ASYNC_DOUBLE_FORFEIT: "Challenge expired unanswered",
  BATTLE_WIN: "Battle won",
  BATTLE_STAT_PENALTY: "Weaker battle stats",
  LEADERBOARD_RANK_UP: "Climbed the leaderboard",
};

/**
 * Rank-improvement bonus: compares each user's current position on the all-time Points
 * leaderboard against their last-seen position (User.lastKnownRank) and pays out for any
 * improvement, then updates the snapshot. Never penalizes a drop — only climbing pays.
 * Not wired to a scheduler yet; call from a cron route or manually, same pattern as
 * lib/battles.ts's sweepBattles and lib/strava.ts's repairMissingStravaPosts.
 */
export async function checkAndAwardRankImprovements(limit = 200): Promise<number> {
  const ranked = await User.find({ points: { $gt: 0 } })
    .sort({ points: -1 })
    .limit(limit)
    .select("_id lastKnownRank")
    .lean();

  let awarded = 0;
  for (let i = 0; i < ranked.length; i++) {
    const user = ranked[i] as { _id: unknown; lastKnownRank: number | null };
    const currentRank = i + 1;

    if (user.lastKnownRank != null && currentRank < user.lastKnownRank) {
      const placesClimbed = user.lastKnownRank - currentRank;
      const bonus = Math.min(placesClimbed * RANK_UP_POINTS_PER_PLACE, RANK_UP_MAX_POINTS_PER_SWEEP);
      // Once per day, not per sweep run — a sweep retried (or scheduled hourly) the same day
      // must not double-award the same climb. A later, further climb the same day still pays
      // (the key includes currentRank, so a new personal-best position gets its own row).
      const key = `rank:${String(user._id)}:${dayKey(new Date())}:${currentRank}`;
      if (await award(user._id, "LEADERBOARD_RANK_UP", bonus, key)) awarded++;
    }

    await User.updateOne({ _id: user._id }, { lastKnownRank: currentRank });
  }

  return awarded;
}
