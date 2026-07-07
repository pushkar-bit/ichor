import { connectDB } from "./mongodb";
import { Post } from "@/models/Post";
import "@/models/Workout";

type WorkoutLean = {
  activityType: string;
  distanceKm: number;
  avgPaceMinPerKm: number | null;
};

/** Only posted (non-hidden) workouts count, matching the leaderboard scoring convention. */
export async function getPersonalBests(userId: string) {
  await connectDB();
  const posts = await Post.find({ userId, isHidden: false }).populate("workoutId").lean();
  const workouts = (posts as any[]).map((p) => p.workoutId).filter(Boolean) as WorkoutLean[];

  const best5k = workouts
    .filter((w) => w.activityType === "RUN" && w.avgPaceMinPerKm && w.distanceKm >= 4.8 && w.distanceKm <= 5.3)
    .sort((a, b) => (a.avgPaceMinPerKm ?? Infinity) - (b.avgPaceMinPerKm ?? Infinity))[0];

  const highestDistance = workouts.reduce<WorkoutLean | null>(
    (max, w) => (w.distanceKm > (max?.distanceKm ?? 0) ? w : max),
    null,
  );

  return {
    best5kPaceMinPerKm: best5k?.avgPaceMinPerKm ?? null,
    highestDistanceKm: highestDistance?.distanceKm ?? null,
  };
}
