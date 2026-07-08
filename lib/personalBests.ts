type WorkoutLean = {
  activityType: string;
  distanceKm: number;
  avgPaceMinPerKm: number | null;
};

/**
 * Pure computation over already-fetched workouts — takes the same populated posts the
 * profile page already loaded instead of re-querying, since these were previously two
 * separate full Post.find({userId}).populate("workoutId") calls fetching the same data.
 */
export function getPersonalBests(workouts: (WorkoutLean | null | undefined)[]) {
  const valid = workouts.filter((w): w is WorkoutLean => Boolean(w));

  const best5k = valid
    .filter((w) => w.activityType === "RUN" && w.avgPaceMinPerKm && w.distanceKm >= 4.8 && w.distanceKm <= 5.3)
    .sort((a, b) => (a.avgPaceMinPerKm ?? Infinity) - (b.avgPaceMinPerKm ?? Infinity))[0];

  const highestDistance = valid.reduce<WorkoutLean | null>(
    (max, w) => (w.distanceKm > (max?.distanceKm ?? 0) ? w : max),
    null,
  );

  return {
    best5kPaceMinPerKm: best5k?.avgPaceMinPerKm ?? null,
    highestDistanceKm: highestDistance?.distanceKm ?? null,
  };
}
