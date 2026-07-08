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

/** A null range means all-time (no date filter). Omitted start/end on a range are open-ended. */
export type DateRange = { start?: Date; end?: Date } | null;

function computeScoreFromPosts(userId: string, posts: PopulatedPost[], dietCards: any[]): ScoreBreakdown {
  const validPosts = posts.filter((p) => p.workoutId);
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

/** Only posted (non-hidden) workouts count toward any leaderboard. */
export async function computeUserScore(userId: string, range: DateRange): Promise<ScoreBreakdown> {
  await connectDB();
  const createdAt: Record<string, Date> = {};
  if (range?.start) createdAt.$gte = range.start;
  if (range?.end) createdAt.$lt = range.end;

  const posts = await Post.find({ userId, isHidden: false, ...(Object.keys(createdAt).length ? { createdAt } : {}) })
    .populate({ path: "workoutId", select: "caloriesBurned distanceKm activityType avgPaceMinPerKm workoutDate" })
    .select("_id workoutId")
    .lean();

  const postIds = posts.map((p) => p._id);
  const dietCards = await DietCard.find({ postId: { $in: postIds } }).select("classification").lean();

  return computeScoreFromPosts(userId, posts as unknown as PopulatedPost[], dietCards);
}

export async function computeUserWeeklyScore(userId: string, at: Date = new Date()): Promise<ScoreBreakdown> {
  return computeUserScore(userId, { start: startOfWeek(at), end: endOfWeek(at) });
}

export async function computeAllWeeklyScores(at: Date = new Date()) {
  return computeAllScoresForRange({ start: startOfWeek(at), end: endOfWeek(at) });
}

/**
 * Batch version — fetches ALL posts and ALL diet cards in just 2 queries,
 * then computes scores for every user purely in memory. Eliminates N+1 query hell.
 */
export async function computeAllScoresForRange(range: DateRange) {
  await connectDB();
  const users = await User.find({}).select("_id name username avatarUrl").lean();
  if (users.length === 0) return [];

  const createdAt: Record<string, Date> = {};
  if (range?.start) createdAt.$gte = range.start;
  if (range?.end) createdAt.$lt = range.end;

  // Single query for all posts across all users
  const allPosts = await Post.find({
    userId: { $in: users.map((u) => u._id) },
    isHidden: false,
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  })
    .populate({ path: "workoutId", select: "caloriesBurned distanceKm activityType avgPaceMinPerKm workoutDate" })
    .select("_id userId workoutId")
    .lean();

  // Group posts by userId
  const postsByUser = new Map<string, PopulatedPost[]>();
  const allPostIds: unknown[] = [];
  for (const post of allPosts as any[]) {
    const uid = String(post.userId);
    if (!postsByUser.has(uid)) postsByUser.set(uid, []);
    postsByUser.get(uid)!.push(post);
    allPostIds.push(post._id);
  }

  // Single query for all diet cards across all posts
  const allDietCards = await DietCard.find({ postId: { $in: allPostIds } })
    .select("postId classification")
    .lean();

  // Group diet cards by postId
  const dietByPost = new Map<string, any[]>();
  for (const dc of allDietCards as any[]) {
    const pid = String(dc.postId);
    if (!dietByPost.has(pid)) dietByPost.set(pid, []);
    dietByPost.get(pid)!.push(dc);
  }

  return users.map((u) => {
    const userPosts = postsByUser.get(String(u._id)) ?? [];
    const userDietCards = userPosts.flatMap((p) => dietByPost.get(String(p._id)) ?? []);
    const score = computeScoreFromPosts(String(u._id), userPosts, userDietCards);
    return { user: u, score };
  });
}

export function integrityTier(points: number): string {
  if (points >= 1000) return "Champion";
  if (points >= 400) return "Committed";
  if (points >= 100) return "Honest Athlete";
  return "Rookie";
}
