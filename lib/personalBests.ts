type WorkoutLean = {
  activityType: string;
  distanceKm: number;
  avgPaceMinPerKm: number | null;
};

/** A run "counts as" a 5K/10K when its total distance falls in these bands. */
export const FIVE_K_BAND = { min: 4.8, max: 5.3 };
export const TEN_K_BAND = { min: 9.7, max: 10.5 };

function bestPaceInBand(workouts: WorkoutLean[], band: { min: number; max: number }) {
  return workouts
    .filter(
      (w) => w.activityType === "RUN" && w.avgPaceMinPerKm && w.distanceKm >= band.min && w.distanceKm <= band.max,
    )
    .sort((a, b) => (a.avgPaceMinPerKm ?? Infinity) - (b.avgPaceMinPerKm ?? Infinity))[0];
}

/**
 * Pure computation over already-fetched workouts — takes the same populated posts the
 * profile page already loaded instead of re-querying, since these were previously two
 * separate full Post.find({userId}).populate("workoutId") calls fetching the same data.
 */
export function getPersonalBests(workouts: (WorkoutLean | null | undefined)[]) {
  const valid = workouts.filter((w): w is WorkoutLean => Boolean(w));

  const best5k = bestPaceInBand(valid, FIVE_K_BAND);
  const best10k = bestPaceInBand(valid, TEN_K_BAND);

  const highestDistance = valid.reduce<WorkoutLean | null>(
    (max, w) => (w.distanceKm > (max?.distanceKm ?? 0) ? w : max),
    null,
  );

  return {
    best5kPaceMinPerKm: best5k?.avgPaceMinPerKm ?? null,
    best10kPaceMinPerKm: best10k?.avgPaceMinPerKm ?? null,
    highestDistanceKm: highestDistance?.distanceKm ?? null,
  };
}
