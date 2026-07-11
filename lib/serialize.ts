type RawJoinedPost = {
  _id: unknown;
  userId: { _id?: unknown; name?: string; username?: string | null; avatarUrl?: string } | unknown;
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
  hypeCount?: number;
  hypeUserIds?: unknown[];
  respectCount?: number;
  respectUserIds?: unknown[];
  challengeCount?: number;
  challengeUserIds?: unknown[];
  commentCount?: number;
  zoneName?: string | null;
  reactionSummary?: { featuredName: string; featuredAvatarUrl: string; totalCount: number } | null;
};

export function serializePost(post: RawJoinedPost, currentUserId?: string) {
  const workout = post.workoutId;
  const author = post.userId as { _id?: unknown; name?: string; username?: string | null; avatarUrl?: string };
  return {
    id: String(post._id),
    author: {
      id: String(author?._id ?? author),
      name: author?.name ?? "Athlete",
      username: author?.username ?? null,
      avatarUrl: author?.avatarUrl ?? "",
    },
    createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
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
    hypeCount: post.hypeCount ?? 0,
    hypeGiven: currentUserId ? (post.hypeUserIds ?? []).some((id) => String(id) === String(currentUserId)) : false,
    respectCount: post.respectCount ?? 0,
    respectGiven: currentUserId ? (post.respectUserIds ?? []).some((id) => String(id) === String(currentUserId)) : false,
    challengeCount: post.challengeCount ?? 0,
    challengeGiven: currentUserId ? (post.challengeUserIds ?? []).some((id) => String(id) === String(currentUserId)) : false,
    commentCount: post.commentCount ?? 0,
    zoneName: post.zoneName ?? null,
    reactionSummary: post.reactionSummary ?? null,
  };
}
