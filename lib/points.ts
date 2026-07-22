import { PointsLedger, type PointReason } from "@/models/PointsLedger";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
import { Territory } from "@/models/Territory";
import { getPersonalBests, FIVE_K_BAND, TEN_K_BAND } from "./personalBests";
import { isTerritoryEligibleRun } from "./territoryEngine";
import { weekKey } from "./week";

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

/** Faster pace, bigger award — sub-5:00/km, 5:00-6:00, 6:00-7:00. Slower than 7:00/km pays
 * nothing. Only runs ≥ PACE_MIN_DISTANCE_KM, once per day. */
const PACE_BANDS: { maxPace: number; reason: PointReason; points: number }[] = [
  { maxPace: 5.0, reason: "PACE_BONUS_FAST", points: 50 },
  { maxPace: 6.0, reason: "PACE_BONUS_MID", points: 30 },
  { maxPace: 7.0, reason: "PACE_BONUS_SLOW", points: 10 },
];
const PACE_MIN_DISTANCE_KM = 3;

export const PB_5K_POINTS = 150;
export const PB_10K_POINTS = 250;
export const PB_LONGEST_POINTS = 100;
/** Flat, per qualifying run — see points.md. */
export const BASE_ACTIVITY_POINTS = 10;
/** Points per km — see points.md. */
export const DISTANCE_BONUS_POINTS_PER_KM = 5;
/** First qualifying run of the day only. */
export const DAILY_FIRST_POST_POINTS = 20;
export const STREAK_7_POINTS = 100;
export const STREAK_30_POINTS = 500;
export const DIET_CLEAN_POINTS = 50;
export const DIET_NEUTRAL_POINTS = 25;
export const TERRITORY_CLAIMED_POINTS = 200;
/** Points per km credited to a territory you own, from ANY runner's overlap — the "landlord"
 * bonus. See lib/territoryEngine.ts's bumpFame call site. */
export const TERRITORY_VALUE_GROWTH_POINTS_PER_KM = 5;
/** Fraction of the value forfeited to an attacker that becomes an extra points penalty for
 * the divided owner, on top of the existing REFUSAL_BETTER/WORSE deltas. See lib/battles.ts. */
export const OWNERSHIP_DIVIDED_PENALTY_RATE = 0.05;
export const TERRITORY_HOLD_WEEKLY_POINTS = 50;
/** Ranked by fameScore — the same "how alive is this land" metric behind the map's Most
 * Famous Territories list. See checkAndAwardWeeklyTerritoryBonuses. */
const TERRITORY_LEADERBOARD_BONUS: Record<1 | 2 | 3, { reason: PointReason; points: number }> = {
  1: { reason: "TERRITORY_LEADERBOARD_1", points: 75 },
  2: { reason: "TERRITORY_LEADERBOARD_2", points: 40 },
  3: { reason: "TERRITORY_LEADERBOARD_3", points: 20 },
};

/** Rank-climb tiers, checked by climb size (places moved up), highest band ≤ climb wins. */
const RANK_IMPROVEMENT_BANDS: { minPlaces: number; reason: PointReason; points: number }[] = [
  { minPlaces: 16, reason: "RANK_IMPROVEMENT_LARGE", points: 50 },
  { minPlaces: 6, reason: "RANK_IMPROVEMENT_MID", points: 25 },
  { minPlaces: 1, reason: "RANK_IMPROVEMENT_SMALL", points: 10 },
];
/** One-time weekly bonus for reaching the top 3 overall ranks — see checkAndAwardRankImprovements. */
const RANK_MILESTONE_POINTS: Record<1 | 2 | 3, { reason: PointReason; points: number }> = {
  1: { reason: "RANK_1_WEEKLY", points: 200 },
  2: { reason: "RANK_2_WEEKLY", points: 100 },
  3: { reason: "RANK_3_WEEKLY", points: 50 },
};

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

  // 0a. Base activity — flat, every qualifying run (still capped by DAILY_SCORING_RUN_CAP).
  if (await award(userId, "BASE_ACTIVITY", BASE_ACTIVITY_POINTS, `wk:${wk}:BASE_ACTIVITY`, { workoutId: workout._id })) {
    awards.push({ reason: "BASE_ACTIVITY", amount: BASE_ACTIVITY_POINTS });
  }

  // 0b. First post of the day — on top of base activity, once per day (the uniqueKey embeds
  //     the day, so a second qualifying run the same day just no-ops).
  {
    const key = `daily:${String(userId)}:${dayKey(workout.workoutDate)}`;
    if (await award(userId, "DAILY_FIRST_POST", DAILY_FIRST_POST_POINTS, key, { workoutId: workout._id })) {
      awards.push({ reason: "DAILY_FIRST_POST", amount: DAILY_FIRST_POST_POINTS });
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

  // 3. Pace bonus — sub-5:00/km, 5:00-6:00, or 6:00-7:00; slower than 7:00/km pays nothing.
  //    Once per day (the uniqueKey embeds the day, so the first eligible run of the day
  //    takes it and later runs no-op).
  if (pace != null && workout.distanceKm >= PACE_MIN_DISTANCE_KM) {
    const paceBand = PACE_BANDS.find((b) => pace < b.maxPace);
    if (paceBand) {
      const key = `pace:${String(userId)}:${dayKey(workout.workoutDate)}`;
      if (await award(userId, paceBand.reason, paceBand.points, key, { workoutId: workout._id })) {
        awards.push({ reason: paceBand.reason, amount: paceBand.points });
      }
    }
  }

  // 4. Distance bonus — every kilometer of a qualifying run pays out, on top of the band/PB/
  //    pace rewards above (still inside the same DAILY_SCORING_RUN_CAP gate this whole
  //    function opened with, so it can't be farmed with many tiny runs in one day).
  const kmBonus = Math.round(workout.distanceKm * DISTANCE_BONUS_POINTS_PER_KM);
  if (kmBonus > 0 && (await award(userId, "DISTANCE_BONUS", kmBonus, `wk:${wk}:DISTANCE_BONUS`, { workoutId: workout._id }))) {
    awards.push({ reason: "DISTANCE_BONUS", amount: kmBonus });
  }

  return awards;
}

/** Human labels for toasts/inbox — kept next to the rules so they move together. */
export const POINT_REASON_LABELS: Record<PointReason, string> = {
  BASE_ACTIVITY: "Logged a run",
  DISTANCE_BONUS: "Distance bonus",
  PACE_BONUS_FAST: "Pace bonus (sub-5:00/km)",
  PACE_BONUS_MID: "Pace bonus (5:00-6:00/km)",
  PACE_BONUS_SLOW: "Pace bonus (6:00-7:00/km)",
  DAILY_FIRST_POST: "First run of the day",
  STREAK_7: "7-day streak",
  STREAK_30: "30-day streak",
  THRESHOLD_5K: "5K run",
  THRESHOLD_10K: "10K run",
  THRESHOLD_15K: "15K run",
  THRESHOLD_HALF: "Half marathon",
  THRESHOLD_30K: "30K run",
  THRESHOLD_FULL: "Marathon",
  PB_5K: "New 5K personal best",
  PB_10K: "New 10K personal best",
  PB_LONGEST: "Longest run ever",
  DIET_CLEAN: "Clean diet log",
  DIET_NEUTRAL: "Diet log",
  TERRITORY_CREATED: "New territory claimed",
  TERRITORY_VALUE_GROWTH: "Territory grew",
  TERRITORY_HOLD_WEEKLY: "Held territory this week",
  TERRITORY_LEADERBOARD_1: "#1 on a territory's leaderboard",
  TERRITORY_LEADERBOARD_2: "#2 on a territory's leaderboard",
  TERRITORY_LEADERBOARD_3: "#3 on a territory's leaderboard",
  ATTACK_WIN: "Attack won",
  WAR_WIN: "War won",
  DEFEND_WIN: "Defended successfully",
  ATTACK_LOSS: "Attack failed",
  TERRITORY_LOST: "Lost territory",
  REFUSAL_BETTER: "Territory split (stronger run)",
  REFUSAL_WORSE: "Territory split (weaker run)",
  OWNERSHIP_DIVIDED_2: "Territory divided",
  OWNERSHIP_DIVIDED_3: "Territory divided 3 ways",
  DUEL_DOUBLE_FORFEIT: "Duel no-show",
  ASYNC_DOUBLE_FORFEIT: "Challenge expired unanswered",
  BATTLE_WIN: "Battle won",
  BATTLE_STAT_PENALTY: "Weaker battle stats",
  RANK_IMPROVEMENT_SMALL: "Climbed the leaderboard",
  RANK_IMPROVEMENT_MID: "Climbed the leaderboard",
  RANK_IMPROVEMENT_LARGE: "Climbed the leaderboard",
  RANK_1_WEEKLY: "#1 on the weekly leaderboard",
  RANK_2_WEEKLY: "#2 on the weekly leaderboard",
  RANK_3_WEEKLY: "#3 on the weekly leaderboard",
};

/**
 * Rank-improvement bonus: compares each user's current position on the all-time Points
 * leaderboard against their last-seen position (User.lastKnownRank) and pays out for any
 * improvement (tiered by how many places climbed), plus a one-time-per-week milestone bonus
 * for reaching the top 3 overall. Never penalizes a drop — only climbing pays. Then updates
 * the snapshot. Not wired to a scheduler yet; call from a cron route or manually, same
 * pattern as lib/battles.ts's sweepBattles and lib/strava.ts's repairMissingStravaPosts.
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
      const band = RANK_IMPROVEMENT_BANDS.find((b) => placesClimbed >= b.minPlaces);
      if (band) {
        // Once per day, not per sweep run — a sweep retried (or scheduled hourly) the same
        // day must not double-award the same climb. A later, further climb the same day
        // still pays (the key includes currentRank, so a new PB position gets its own row).
        const key = `rank:${String(user._id)}:${dayKey(new Date())}:${currentRank}`;
        if (await award(user._id, band.reason, band.points, key)) awarded++;
      }
    }

    if (currentRank <= 3) {
      const milestone = RANK_MILESTONE_POINTS[currentRank as 1 | 2 | 3];
      // Once per week per rank — reaching #1 and holding it doesn't re-pay every sweep.
      const key = `rank-milestone:${String(user._id)}:${weekKey()}:${currentRank}`;
      if (await award(user._id, milestone.reason, milestone.points, key)) awarded++;
    }

    await User.updateOne({ _id: user._id }, { lastKnownRank: currentRank });
  }

  return awarded;
}

/**
 * Weekly territory sweep: pays every current territory owner a hold bonus, plus a bigger
 * bonus to the owners of the top-3 territories on the map's fame leaderboard (the same
 * fameScore ranking behind getTerritoryFameLeaderboard — "how alive is this land" is the
 * only real per-territory ranking this data model has; there's no per-runner-per-territory
 * leaderboard to rank, so this doesn't fabricate one). Idempotent per territory per week —
 * not wired to a scheduler yet, same pattern as checkAndAwardRankImprovements.
 */
export async function checkAndAwardWeeklyTerritoryBonuses(): Promise<number> {
  const week = weekKey();
  const territories = await Territory.find({}).select("_id ownerId fameScore").sort({ fameScore: -1 }).lean();

  let awarded = 0;
  for (let i = 0; i < territories.length; i++) {
    const t = territories[i] as { _id: unknown; ownerId: unknown };
    if (!t.ownerId) continue;

    const holdKey = `territory-hold:${String(t._id)}:${week}`;
    if (await award(t.ownerId, "TERRITORY_HOLD_WEEKLY", TERRITORY_HOLD_WEEKLY_POINTS, holdKey, { territoryId: t._id })) {
      awarded++;
    }

    if (i < 3) {
      const bonus = TERRITORY_LEADERBOARD_BONUS[(i + 1) as 1 | 2 | 3];
      const rankKey = `territory-rank:${String(t._id)}:${week}:${i + 1}`;
      if (await award(t.ownerId, bonus.reason, bonus.points, rankKey, { territoryId: t._id })) awarded++;
    }
  }

  return awarded;
}
