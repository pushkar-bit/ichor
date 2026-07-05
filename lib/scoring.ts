import { connectDB } from "./mongodb";
import { Post } from "@/models/Post";
import "@/models/Workout";
import { DietCard } from "@/models/DietCard";
import { User } from "@/models/User";
import { startOfWeek, endOfWeek, dayKey } from "./week";

type PopulatedPost = {
  _id: unknown;
  workoutId: {
    caloriesBurned: number;
    distanceKm: number;
    activityType: string;
    avgPaceMinPerKm: number | null;
    workoutDate: Date;
  } | null;
};

export type ScoreBreakdown = {
  userId: string;
  baseCalories: number;
  activeDays: number;
  consistencyMultiplier: number;
  integrityBonus: number;
  cheatPenalty: number;
  finalScore: number;
  totalDistanceKm: number;
  avgPaceMinPerKm: number | null;
  runCount: number;
};

/** Only posted (non-hidden) workouts count toward any leaderboard. */
export async function computeUserWeeklyScore(
  userId: string,
  at: Date = new Date(),
): Promise<ScoreBreakdown> {
  await connectDB();
  const start = startOfWeek(at);
  const end = endOfWeek(at);

  const posts = await Post.find({ userId, isHidden: false, createdAt: { $gte: start, $lt: end } })
    .populate("workoutId")
    .lean();

  const validPosts = (posts as unknown as PopulatedPost[]).filter((p) => p.workoutId);
  const baseCalories = validPosts.reduce((sum, p) => sum + (p.workoutId?.caloriesBurned || 0), 0);
  const totalDistanceKm = validPosts.reduce((sum, p) => sum + (p.workoutId?.distanceKm || 0), 0);

  const runPosts = validPosts.filter((p) => p.workoutId?.activityType === "RUN" && p.workoutId?.avgPaceMinPerKm);
  const avgPaceMinPerKm =
    runPosts.length >= 3
      ? runPosts.reduce((s, p) => s + (p.workoutId?.avgPaceMinPerKm ?? 0), 0) / runPosts.length
      : null;

  const activeDaySet = new Set(validPosts.map((p) => dayKey(new Date(p.workoutId!.workoutDate))));
  const activeDays = activeDaySet.size;
  const consistencyMultiplier = Math.min(1.0 + Math.max(activeDays - 1, 0) * 0.1, 2.0);

  const postIds = validPosts.map((p) => p._id);
  const dietCards = await DietCard.find({ postId: { $in: postIds } }).lean();
  const cleanCount = dietCards.filter((d) => d.classification === "CLEAN").length;
  const cheatCount = dietCards.filter((d) => d.classification === "CHEAT").length;

  const integrityBonus = cleanCount * 50;
  const cheatPenalty = cheatCount > 0 ? baseCalories * 0.1 : 0;

  const finalScore = baseCalories * consistencyMultiplier + integrityBonus - cheatPenalty;

  return {
    userId,
    baseCalories,
    activeDays,
    consistencyMultiplier,
    integrityBonus,
    cheatPenalty,
    finalScore: Math.round(finalScore),
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    avgPaceMinPerKm,
    runCount: runPosts.length,
  };
}

export async function computeAllWeeklyScores(at: Date = new Date()) {
  await connectDB();
  const users = await User.find({}).lean();
  const scores = await Promise.all(users.map((u) => computeUserWeeklyScore(String(u._id), at)));
  return scores.map((s, i) => ({ user: users[i], score: s }));
}

export function integrityTier(points: number): string {
  if (points >= 1000) return "Champion";
  if (points >= 400) return "Committed";
  if (points >= 100) return "Honest Athlete";
  return "Rookie";
}
