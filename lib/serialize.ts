type RawJoinedPost = {
  _id: unknown;
  userId: { _id?: unknown; name?: string; avatarUrl?: string } | unknown;
  workoutId: {
    activityType?: string;
    distanceKm?: number;
    durationSeconds?: number;
    avgPaceMinPerKm?: number | null;
    caloriesBurned?: number;
    sourceType?: string;
    screenshotUrl?: string | null;
  } | null;
  createdAt: Date | string;
  photoUrls?: string[];
  caption?: string;
  dietCard?: { classification: "CLEAN" | "CHEAT" | "NEUTRAL"; estimatedCalories: number | null } | null;
  avgFlameRating?: number;
  flameCount?: number;
  kudosCount?: number;
  kudosUserIds?: unknown[];
  commentCount?: number;
  zoneName?: string | null;
};

export function serializePost(post: RawJoinedPost, currentUserId?: string) {
  const workout = post.workoutId;
  const author = post.userId as { _id?: unknown; name?: string; avatarUrl?: string };
  return {
    id: String(post._id),
    author: {
      id: String(author?._id ?? author),
      name: author?.name ?? "Athlete",
      avatarUrl: author?.avatarUrl ?? "",
    },
    createdAt: post.createdAt,
    workout: {
      activityType: workout?.activityType ?? "RUN",
      distanceKm: workout?.distanceKm ?? 0,
      durationSeconds: workout?.durationSeconds ?? 0,
      avgPaceMinPerKm: workout?.avgPaceMinPerKm ?? null,
      caloriesBurned: workout?.caloriesBurned ?? 0,
      sourceType: workout?.sourceType ?? "MANUAL",
      screenshotUrl: workout?.screenshotUrl ?? null,
    },
    photoUrls: post.photoUrls ?? [],
    caption: post.caption ?? "",
    dietCard: post.dietCard
      ? { classification: post.dietCard.classification, estimatedCalories: post.dietCard.estimatedCalories }
      : null,
    avgFlameRating: post.avgFlameRating ?? 0,
    flameCount: post.flameCount ?? 0,
    kudosCount: post.kudosCount ?? 0,
    kudosGiven: currentUserId
      ? (post.kudosUserIds ?? []).some((id) => String(id) === String(currentUserId))
      : false,
    commentCount: post.commentCount ?? 0,
    zoneName: post.zoneName ?? null,
  };
}
