import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Workout } from "@/models/Workout";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { User } from "@/models/User";
import { classifyDiet } from "@/lib/ai";
import { claimZone } from "@/lib/territory";
import { evaluateBadges } from "@/lib/badges";
import { dayKey, weekKey } from "@/lib/week";
import { computeUserWeeklyScore } from "@/lib/scoring";
import { addScore } from "@/lib/redis";

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
  } = body;

  if (!activityType || !distanceKm || !durationSeconds || !caloriesBurned) {
    return NextResponse.json({ error: "Missing required workout fields" }, { status: 400 });
  }
  if (!photoUrls || photoUrls.length === 0) {
    return NextResponse.json({ error: "At least one photo is required" }, { status: 400 });
  }

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

  const post = await Post.create({
    userId: me._id,
    workoutId: workout._id,
    caption: caption ?? "",
    photoUrls,
    locationZoneId: locationZoneId ?? null,
    isPublic: isPublic ?? true,
  });

  const today = dayKey(new Date());
  const lastPost = me.lastPostDate ? dayKey(new Date(me.lastPostDate)) : null;
  if (lastPost !== today) {
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    const newStreak = lastPost === yesterday ? me.streakDays + 1 : 1;
    me.streakDays = newStreak;
    me.bestStreakDays = Math.max(me.bestStreakDays, newStreak);
    me.lastPostDate = new Date();
  }
  me.totalDistanceKm += distanceKm;
  me.totalWorkouts += 1;
  me.totalCalories += caloriesBurned;

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
    locationZoneId ? claimZone(String(me._id), locationZoneId, caloriesBurned) : Promise.resolve(null),
  ]);

  // me.save() persists the mutations above; evaluateBadges reads those same in-memory
  // fields (plus its own DB counts) so it doesn't need to wait on the save to finish;
  // computeUserWeeklyScore reads the Post/DietCard docs already created above. None of the
  // three depend on each other's result, so run them together instead of sequentially.
  const [, newBadges, updatedScore] = await Promise.all([
    me.save(),
    evaluateBadges(me),
    computeUserWeeklyScore(String(me._id)),
  ]);

  if (newBadges.length) {
    await User.updateOne({ _id: me._id }, { $addToSet: { badges: { $each: newBadges } } });
  }

  const week = weekKey();
  await Promise.all([
    addScore(`lb:calories:${week}`, String(me._id), updatedScore.finalScore),
    addScore(`lb:distance:${week}`, String(me._id), updatedScore.totalDistanceKm),
  ]);

  return NextResponse.json({
    postId: String(post._id),
    workoutId: String(workout._id),
    dietCard,
    territoryEvent,
    newBadges,
  });
}
