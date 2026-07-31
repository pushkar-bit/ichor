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
  territorySnapshot?: RawTerritorySnapshot | null;
};

type SnapshotGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

/** As stored on the Post at ingest — see models/Post.ts and lib/runGameplay.ts. */
type RawTerritorySnapshot = {
  claimed?: {
    territoryId?: unknown;
    name?: string;
    areaSqM?: number;
    valuePoints?: number;
    color?: string;
    geometry?: unknown;
    bbox?: number[];
  } | null;
  crossed?: {
    territoryId?: unknown;
    name?: string;
    ownerId?: unknown;
    ownerName?: string | null;
    coveragePct?: number;
    isRival?: boolean;
  }[];
  district?: string | null;
};

/**
 * Flattens the stored snapshot into the shape the feed card renders. A snapshot with neither
 * a claim nor any crossed land is normalized to null so the card can skip the ribbon on a
 * single check — and older posts (written before snapshots existed) simply have none.
 */
function serializeTerritorySnapshot(raw: RawTerritorySnapshot | null | undefined) {
  if (!raw) return null;
  const claimed =
    raw.claimed && raw.claimed.geometry && raw.claimed.bbox
      ? {
          territoryId: String(raw.claimed.territoryId),
          name: raw.claimed.name ?? "New ground",
          areaSqM: raw.claimed.areaSqM ?? 0,
          valuePoints: raw.claimed.valuePoints ?? 0,
          color: raw.claimed.color ?? "#AE93F4",
          // Stored as Mixed on the Post (models/Post.ts), so the union has to be reasserted
          // here — the snapshot writer only ever puts GeoJSON polygons in it.
          geometry: raw.claimed.geometry as SnapshotGeometry,
          bbox: raw.claimed.bbox as [number, number, number, number],
        }
      : null;
  const crossed = (raw.crossed ?? []).map((c) => ({
    territoryId: String(c.territoryId),
    name: c.name ?? "Unnamed ground",
    ownerId: c.ownerId ? String(c.ownerId) : null,
    ownerName: c.ownerName ?? null,
    coveragePct: c.coveragePct ?? 0,
    isRival: Boolean(c.isRival),
  }));
  if (!claimed && crossed.length === 0) return null;
  return { claimed, crossed, district: raw.district ?? null };
}

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
    territorySnapshot: serializeTerritorySnapshot(post.territorySnapshot),
  };
}
