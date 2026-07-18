import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Workout } from "@/models/Workout";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { classifyDiet } from "@/lib/ai";
import { runGameplayPipeline } from "@/lib/runGameplay";
import { findActiveGroupRunForUser, attachRunToGroupRun } from "@/lib/groupRun";
import { recordWorkoutStats } from "@/lib/recordWorkout";
import { getPersonalBests } from "@/lib/personalBests";
import type { TerritoryRunResult } from "@/lib/territoryEngine";
import type { PointsAward } from "@/lib/points";

export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const {
    activityType,
    distanceKm,
    durationSeconds,
    avgPaceMinPerKm,
    caloriesBurned,
    heartRateAvg,
    workoutDate,
    screenshotUrl,
    caption,
    photoUrls,
    isPublic,
    dietDescription,
    dietResult,
  } = body;

  if (!activityType || !distanceKm || !durationSeconds || !caloriesBurned) {
    return NextResponse.json({ error: "Missing required workout fields" }, { status: 400 });
  }
  if (!photoUrls || photoUrls.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
  }

  // Fetched before the new Workout exists, so this is strictly the "prior" record to beat.
  type PopulatedPost = { workoutId: { activityType: string; distanceKm: number; avgPaceMinPerKm: number | null } | null };
  const priorPosts = await Post.find({ userId: me._id, isHidden: false })
    .select({ workoutId: 1 })
    .populate({ path: "workoutId", select: "activityType distanceKm avgPaceMinPerKm" })
    .lean();
  const priorBests = getPersonalBests((priorPosts as unknown as PopulatedPost[]).map((p) => p.workoutId));

  // This is the manual/self-reported path: it is ALWAYS MANUAL + PENDING. sourceType and
  // verificationStatus are never taken from the request body — trusting a client-supplied
  // "HEALTH_SYNC" would let anyone mint a VERIFIED run and (once a manual path carries a GPS
  // route) claim/attack territory with fabricated geometry. Only the Strava webhook, which
  // owns the OAuth-backed data, may create VERIFIED HEALTH_SYNC workouts.
  const workout = await Workout.create({
    userId: me._id,
    sourceType: "MANUAL",
    activityType,
    distanceKm,
    durationSeconds,
    avgPaceMinPerKm: avgPaceMinPerKm ?? null,
    caloriesBurned,
    heartRateAvg: heartRateAvg ?? null,
    workoutDate: workoutDate ? new Date(workoutDate) : new Date(),
    screenshotUrl: screenshotUrl ?? null,
    verificationStatus: "PENDING",
  });

  // If this run lands inside a War group run's capture window and the user is a participant
  // still waiting on a run, this workout is theirs for that war — no separate "start tracking".
  const activeGroupRun = await findActiveGroupRunForUser(String(me._id), workout.workoutDate);

  const post = await Post.create({
    userId: me._id,
    workoutId: workout._id,
    caption: caption ?? "",
    photoUrls,
    isPublic: isPublic ?? true,
    groupRunId: activeGroupRun ? activeGroupRun._id : null,
  });

  if (activeGroupRun) {
    await attachRunToGroupRun(String(activeGroupRun._id), String(me._id), String(workout._id));
  }

  // Diet classification (a Gemini call — several seconds) and gameplay processing touch
  // completely independent data, so run them concurrently instead of back to back. The post
  // already exists at this point — a failure in here must never turn into a 500 for a post
  // that actually succeeded, so everything below is best-effort (logged, not thrown). See
  // lib/runGameplay.ts for why this matters: a bug in this exact pipeline once silently
  // stranded every Strava-synced run behind it.
  const hasDiet = Boolean(dietDescription && dietDescription.trim().length > 0);
  let dietCard = null;
  let territoryResult: TerritoryRunResult = { claimed: null, opportunities: [] };
  let pointsAwarded: PointsAward[] = [];
  try {
    [dietCard, { territoryResult, pointsAwarded }] = await Promise.all([
      hasDiet
        ? (async () => {
            const result = dietResult ?? (await classifyDiet(dietDescription));
            const card = await DietCard.create({
              postId: post._id,
              description: dietDescription,
              classification: result.classification,
              estimatedCalories: result.estimatedCalories,
              integrityBonus: result.integrityBonus,
              suggestion: result.suggestion,
            });
            me.integrityPoints += result.integrityBonus;
            await me.save();
            return card;
          })()
        : Promise.resolve(null),
      // No-ops for manual/OCR posts via the eligibility gate; a future HealthKit-style source
      // with GPS routes will just start claiming without changes here.
      runGameplayPipeline({ _id: me._id, name: me.name }, workout),
    ]);
  } catch (err) {
    console.error(`[posts] gameplay pipeline failed for workout ${workout._id} (post ${post._id} still created):`, err);
  }

  const { newBadges } = await recordWorkoutStats(me, { distanceKm, caloriesBurned }, new Date());

  const newPersonalBests = {
    distance: distanceKm > (priorBests.highestDistanceKm ?? 0),
    pace:
      activityType === "RUN" &&
      avgPaceMinPerKm != null &&
      distanceKm >= 4.8 &&
      distanceKm <= 5.3 &&
      (priorBests.best5kPaceMinPerKm === null || avgPaceMinPerKm < priorBests.best5kPaceMinPerKm),
  };

  return NextResponse.json({
    postId: String(post._id),
    workoutId: String(workout._id),
    dietCard,
    territoryResult,
    pointsAwarded,
    newBadges,
    newPersonalBests,
  });
}
