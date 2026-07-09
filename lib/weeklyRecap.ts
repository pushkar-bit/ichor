import { computeUserScore, computeUserWeeklyScore } from "./scoring";
import { getUserRank } from "./redis";
import { startOfWeek, endOfWeek, weekKey } from "./week";

export type WeeklyRecap = {
  distanceKm: number;
  calories: number;
  distanceDeltaKm: number;
  caloriesDelta: number;
  currentRank: number | null;
  lastWeekRank: number | null;
  /** Positive = moved up (better) — rank 1 beats rank 2, so this is lastWeekRank - currentRank. */
  rankChange: number | null;
};

/** This week vs last week, for the "calories" weekly leaderboard specifically (the default category). */
export async function getWeeklyRecap(userId: string): Promise<WeeklyRecap> {
  const now = new Date();
  const lastWeekDate = new Date(now.getTime() - 7 * 86400000);

  const [current, previous, currentRank, lastWeekRank] = await Promise.all([
    computeUserWeeklyScore(userId, now),
    computeUserScore(userId, { start: startOfWeek(lastWeekDate), end: endOfWeek(lastWeekDate) }),
    getUserRank(`lb:calories:${weekKey(now)}`, userId),
    getUserRank(`lb:calories:${weekKey(lastWeekDate)}`, userId),
  ]);

  return {
    distanceKm: current.totalDistanceKm,
    calories: current.baseCalories,
    distanceDeltaKm: Math.round((current.totalDistanceKm - previous.totalDistanceKm) * 100) / 100,
    caloriesDelta: Math.round(current.baseCalories - previous.baseCalories),
    currentRank,
    lastWeekRank,
    rankChange: currentRank !== null && lastWeekRank !== null ? lastWeekRank - currentRank : null,
  };
}
