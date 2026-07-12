import { Workout } from "@/models/Workout";
import { Post } from "@/models/Post";
import { recordWorkoutStats } from "./recordWorkout";
import { buildStravaRouteMapUrl } from "./stravaRouteMap";
import { decodePolyline } from "./polyline";
import { processRunForTerritory } from "./territoryEngine";
import { attachQualifyingRunsToBattles } from "./battles";
import { awardPointsForWorkout } from "./points";
import { findActiveGroupRunForUser, attachRunToGroupRun } from "./groupRun";

const STRAVA_ACTIVITY_TYPE_MAP: Record<string, "RUN" | "WALK" | "CYCLE"> = {
  Run: "RUN",
  TrailRun: "RUN",
  VirtualRun: "RUN",
  Walk: "WALK",
  Hike: "WALK",
  Ride: "CYCLE",
  VirtualRide: "CYCLE",
  EBikeRide: "CYCLE",
  MountainBikeRide: "CYCLE",
  GravelRide: "CYCLE",
  Handcycle: "CYCLE",
};

export function mapStravaActivityType(type: string): "RUN" | "WALK" | "CYCLE" | null {
  return STRAVA_ACTIVITY_TYPE_MAP[type] ?? null;
}

export type StravaActivity = {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  start_date: string; // ISO
  average_heartrate?: number | null;
  calories?: number | null;
  map?: { summary_polyline?: string | null; polyline?: string | null } | null;
  photos?: { count: number } | null;
};

type StravaLinkedUser = {
  _id: unknown;
  name?: string;
  weightKg?: number | null;
  stravaAthleteId?: string | null;
  stravaAccessToken?: string | null;
  stravaRefreshToken?: string | null;
  stravaTokenExpiresAt?: Date | null;
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

async function exchangeWithStrava(body: Record<string, string>) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Strava token request failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete?: { id: number };
  }>;
}

export function exchangeStravaCode(code: string) {
  return exchangeWithStrava({ code, grant_type: "authorization_code" });
}

/** Refreshes and persists a new access token if the current one is expired/near-expiry; otherwise returns the cached one. */
export async function ensureFreshStravaToken(user: StravaLinkedUser): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = user.stravaTokenExpiresAt ? Math.floor(new Date(user.stravaTokenExpiresAt).getTime() / 1000) : 0;
  if (user.stravaAccessToken && expiresAtSeconds - nowSeconds > 60) {
    return user.stravaAccessToken;
  }
  if (!user.stravaRefreshToken) throw new Error("No Strava refresh token on file for this user");

  const data = await exchangeWithStrava({ grant_type: "refresh_token", refresh_token: user.stravaRefreshToken });
  user.stravaAccessToken = data.access_token;
  user.stravaRefreshToken = data.refresh_token;
  user.stravaTokenExpiresAt = new Date(data.expires_at * 1000);
  await user.save();
  return data.access_token;
}

export async function fetchStravaActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status}`);
  return res.json();
}

async function fetchStravaActivityPhotos(accessToken: string, activityId: number): Promise<string[]> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}/photos?size=600`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return []; // non-fatal — a runner's own photos are a bonus, not required for ingest
  const photos: { urls?: Record<string, string> }[] = await res.json();
  return photos.map((p) => p.urls?.["600"]).filter((url): url is string => Boolean(url));
}

/**
 * Creates a Workout + a Post for one Strava activity (called only from the webhook —
 * see app/api/integrations/strava/webhook/route.ts — so this only ever fires for activities
 * created after the user connected Strava, never historical ones) and rolls it into the user's
 * stats. A Post is required alongside the Workout because scoring/badges/leaderboards
 * (lib/scoring.ts, lib/badges.ts) all read from Posts, not raw Workouts, and the feed itself
 * only reads Posts with `isPublic: true` — so synced activities need to be public to show up
 * in the main feed like manually-created posts do. Returns null for unsupported activity types
 * or activities already synced (caught via the unique userId+externalId index on Workout).
 *
 * `accessToken` is optional and only used to fetch the runner's own Strava photos. Without it,
 * or when the activity has none, the post still always gets the generated route-map image.
 */
export async function ingestStravaActivity(user: StravaLinkedUser, activity: StravaActivity, accessToken?: string) {
  const activityType = mapStravaActivityType(activity.sport_type ?? activity.type);
  if (!activityType) return null;

  const distanceKm = activity.distance / 1000;
  const durationSeconds = activity.moving_time || activity.elapsed_time;
  if (!distanceKm || !durationSeconds) return null;

  const avgPaceMinPerKm = activityType === "RUN" ? durationSeconds / 60 / distanceKm : null;
  const caloriesBurned =
    activity.calories && activity.calories > 0
      ? Math.round(activity.calories)
      : Math.round(distanceKm * (user.weightKg || 62) * 1.036);
  const workoutDate = new Date(activity.start_date);

  const encodedPolyline = activity.map?.summary_polyline ?? activity.map?.polyline;
  // GeoJSON wants [lng, lat]; decodePolyline returns [lat, lng] pairs (Strava's native order).
  const decoded: [number, number][] | null = encodedPolyline
    ? decodePolyline(encodedPolyline).map(([lat, lng]) => [lng, lat])
    : null;
  // A near-zero-movement activity (GPS glitch, accidental start/stop) decodes to a polyline
  // where every point is identical — Mongo rejects that as an invalid LineString (needs at
  // least 2 *distinct* vertices), and it's not a real route to detect a zone from anyway.
  const hasRealRoute = decoded && new Set(decoded.map(([lng, lat]) => `${lng},${lat}`)).size >= 2;
  const routeCoordinates = hasRealRoute ? decoded : null;

  let workout;
  try {
    workout = await Workout.create({
      userId: user._id,
      sourceType: "HEALTH_SYNC",
      activityType,
      distanceKm,
      durationSeconds,
      avgPaceMinPerKm,
      caloriesBurned,
      heartRateAvg: activity.average_heartrate ?? null,
      workoutDate,
      externalId: `strava:${activity.id}`,
      verificationStatus: "VERIFIED",
      route: routeCoordinates && routeCoordinates.length >= 2 ? { type: "LineString", coordinates: routeCoordinates } : undefined,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return null; // already synced
    throw err;
  }

  // Route map always goes first (position 0) so it's the guaranteed cover image — the runner's
  // own Strava photos, if any, follow it rather than replacing it.
  const routeMapUrl = buildStravaRouteMapUrl(encodedPolyline);
  const ownPhotos =
    accessToken && activity.photos && activity.photos.count > 0
      ? await fetchStravaActivityPhotos(accessToken, activity.id)
      : [];
  const photoUrls = [routeMapUrl, ...ownPhotos].filter((url): url is string => Boolean(url));

  // Territory + points: the run claims whatever unclaimed ground it covered and earns
  // profile points (thresholds/PBs/pace). Attacking is always a choice, so opportunities
  // become inbox notifications here — there's no live user on the webhook path to prompt.
  const [territoryResult, pointsAwarded] = await Promise.all([
    processRunForTerritory({ _id: user._id, name: user.name }, workout, { notifyOpportunities: true }),
    awardPointsForWorkout(user, workout),
  ]);
  // If this run lands inside an active battle the user is fighting, it becomes their entry.
  await attachQualifyingRunsToBattles(user, workout);

  // If this run lands inside a War group run's capture window and the user is still waiting
  // on a run for it, this is that run — same auto-link manual posts already get.
  const activeGroupRun = await findActiveGroupRunForUser(String(user._id), workoutDate);

  const post = await Post.create({
    userId: user._id,
    workoutId: workout._id,
    caption: activity.name ?? "",
    photoUrls,
    isPublic: true,
    groupRunId: activeGroupRun ? activeGroupRun._id : null,
  });

  if (activeGroupRun) {
    await attachRunToGroupRun(String(activeGroupRun._id), String(user._id), String(workout._id));
  }

  const { newBadges } = await recordWorkoutStats(user, { distanceKm, caloriesBurned }, workoutDate);

  return { workout, post, newBadges, territoryResult, pointsAwarded };
}
