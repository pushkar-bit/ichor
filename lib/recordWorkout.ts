import { User } from "@/models/User";
import { evaluateBadges } from "./badges";
import { computeUserWeeklyScore, type ScoreBreakdown } from "./scoring";
import { addScore } from "./redis";
import { dayKey, weekKey } from "./week";

type StatsEligibleUser = {
  _id: unknown;
  lastPostDate?: Date | null;
  streakDays: number;
  bestStreakDays: number;
  streakFreezesAvailable: number;
  totalDistanceKm: number;
  totalWorkouts: number;
  totalCalories: number;
  badges?: string[];
  battlesWon: number;
  integrityPoints: number;
  save: () => Promise<unknown>;
};

const MAX_STREAK_FREEZES = 2;

/**
 * Streak/totals/badges/score/leaderboard update shared by every path that adds a scored
 * workout (manual post creation, Strava sync). `activityDate` drives the streak calculation —
 * callers pass `new Date()` for "logged right now" (manual posting) or the Strava activity's
 * actual date (webhook sync), so a late-arriving sync event doesn't get miscounted as "today".
 *
 * A gap of exactly one missed day auto-spends a streak freeze (if the user has one) instead of
 * resetting to 1 — a gap of two or more days always resets regardless. Freezes replenish by one
 * (capped at MAX_STREAK_FREEZES) every time a streak hits a 7-day multiple.
 */
export async function recordWorkoutStats(
  me: StatsEligibleUser,
  workout: { distanceKm: number; caloriesBurned: number },
  activityDate: Date,
): Promise<{ newBadges: string[]; updatedScore: ScoreBreakdown; streakFreezeUsed: boolean }> {
  const today = dayKey(activityDate);
  const lastPost = me.lastPostDate ? dayKey(new Date(me.lastPostDate)) : null;
  let streakFreezeUsed = false;

  if (lastPost !== today) {
    const yesterday = dayKey(new Date(activityDate.getTime() - 86400000));
    const twoDaysAgo = dayKey(new Date(activityDate.getTime() - 2 * 86400000));

    let newStreak: number;
    if (lastPost === yesterday) {
      newStreak = me.streakDays + 1;
    } else if (lastPost === twoDaysAgo && me.streakFreezesAvailable > 0) {
      me.streakFreezesAvailable -= 1;
      newStreak = me.streakDays + 1;
      streakFreezeUsed = true;
    } else {
      newStreak = 1;
    }

    me.streakDays = newStreak;
    me.bestStreakDays = Math.max(me.bestStreakDays, newStreak);
    me.lastPostDate = activityDate;

    if (newStreak % 7 === 0) {
      me.streakFreezesAvailable = Math.min(MAX_STREAK_FREEZES, me.streakFreezesAvailable + 1);
    }
  }
  me.totalDistanceKm += workout.distanceKm;
  me.totalWorkouts += 1;
  me.totalCalories += workout.caloriesBurned;

  // me.save() persists the mutations above; evaluateBadges reads those same in-memory
  // fields (plus its own DB counts) so it doesn't need to wait on the save to finish;
  // computeUserWeeklyScore reads the Post/Workout docs the caller already created. None of
  // the three depend on each other's result, so run them together instead of sequentially.
  const [, newBadges, updatedScore] = await Promise.all([
    me.save(),
    evaluateBadges(me),
    computeUserWeeklyScore(String(me._id)),
  ]);

  if (newBadges.length) {
    await User.updateOne({ _id: me._id }, { $addToSet: { badges: { $each: newBadges } } });
  }

  const week = weekKey();
  await Promise.all([
    addScore(`lb:calories:${week}`, String(me._id), updatedScore.finalScore),
    addScore(`lb:distance:${week}`, String(me._id), updatedScore.totalDistanceKm),
  ]);

  return { newBadges, updatedScore, streakFreezeUsed };
}
