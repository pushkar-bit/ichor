import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Workout } from "@/models/Workout";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { classifyDiet } from "@/lib/ai";
import { claimZone, claimOrContestZone, getZoneContest } from "@/lib/territory";
import { paceBonus } from "@/lib/scoring";
import { findActiveGroupRunForUser, attachRunToGroupRun } from "@/lib/groupRun";
import { recordWorkoutStats } from "@/lib/recordWorkout";
import { getPersonalBests } from "@/lib/personalBests";

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
    sourceType,
    screenshotUrl,
    caption,
    photoUrls,
    locationZoneId,
    isPublic,
    dietDescription,
    dietResult,
    contestChoice,
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

  const workout = await Workout.create({
    userId: me._id,
    sourceType: sourceType ?? "MANUAL",
    activityType,
    distanceKm,
    durationSeconds,
    avgPaceMinPerKm: avgPaceMinPerKm ?? null,
    caloriesBurned,
    heartRateAvg: heartRateAvg ?? null,
    workoutDate: workoutDate ? new Date(workoutDate) : new Date(),
    screenshotUrl: screenshotUrl ?? null,
    verificationStatus: sourceType === "HEALTH_SYNC" ? "VERIFIED" : "PENDING",
  });

  // If the zone belongs to someone else, the client is expected to have already shown the
  // invasion overlay and sent back the user's choice. Ignore (or no choice at all) means the
  // post saves normally with no territory link — never fall through to a silent claim.
  const contest = locationZoneId ? await getZoneContest(locationZoneId, String(me._id)) : null;
  const ignoringContestedZone = Boolean(contest) && contestChoice !== "ATTACK" && contestChoice !== "EXPLOIT";

  // If this run lands inside a War group run's capture window and the user is a participant
  // still waiting on a run, this workout is theirs for that war — no separate "start tracking".
  const activeGroupRun = await findActiveGroupRunForUser(String(me._id), workout.workoutDate);

  const post = await Post.create({
    userId: me._id,
    workoutId: workout._id,
    caption: caption ?? "",
    photoUrls,
    locationZoneId: ignoringContestedZone ? null : (locationZoneId ?? null),
    isPublic: isPublic ?? true,
    groupRunId: activeGroupRun ? activeGroupRun._id : null,
  });

  if (activeGroupRun) {
    await attachRunToGroupRun(String(activeGroupRun._id), String(me._id), String(workout._id));
  }

  // Diet classification (a Gemini call — several seconds) and territory claiming touch
  // completely independent data, so run them concurrently instead of back to back.
  const hasDiet = Boolean(dietDescription && dietDescription.trim().length > 0);
  const [dietCard, territoryEvent] = await Promise.all([
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
          // Mutate in-memory rather than a separate updateOne — this rides along with the
          // single me.save() below (and means evaluateBadges sees the up-to-date total for
          // the integrity badge check instead of the pre-bonus value).
          me.integrityPoints += result.integrityBonus;
          return card;
        })()
      : Promise.resolve(null),
    (async () => {
      if (!locationZoneId || ignoringContestedZone) return null;

      if (contest) {
        const result = await claimOrContestZone({
          userId: String(me._id),
          zoneId: locationZoneId,
          workoutId: String(workout._id),
          caloriesBurned,
          paceBonus: paceBonus(avgPaceMinPerKm),
          contestChoice: contestChoice as "ATTACK" | "EXPLOIT",
        });
        await Post.updateOne(
          { _id: post._id },
          {
            contestStatus: result.contestStatus,
            scoreMultiplier: result.scoreMultiplier,
            battleBonusPoints: result.battleBonusPoints,
            linkedAttackId: result.attackId ?? null,
          },
        );
        return result;
      }

      return claimZone(String(me._id), locationZoneId, caloriesBurned);
    })(),
  ]);

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
    territoryEvent,
    newBadges,
    newPersonalBests,
  });
}
