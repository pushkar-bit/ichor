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
import { dayKey } from "@/lib/week";

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

  let dietCard = null;
  if (dietDescription && dietDescription.trim().length > 0) {
    const result = classifyDiet(dietDescription);
    dietCard = await DietCard.create({
      postId: post._id,
      description: dietDescription,
      classification: result.classification,
      estimatedCalories: result.estimatedCalories,
      integrityBonus: result.integrityBonus,
      suggestion: result.suggestion,
    });
    await User.updateOne({ _id: me._id }, { $inc: { integrityPoints: result.integrityBonus } });
  }

  let territoryEvent = null;
  if (locationZoneId) {
    territoryEvent = await claimZone(String(me._id), locationZoneId, caloriesBurned);
  }

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
  await me.save();

  const newBadges = await evaluateBadges(me);
  if (newBadges.length) {
    await User.updateOne({ _id: me._id }, { $addToSet: { badges: { $each: newBadges } } });
  }

  return NextResponse.json({
    postId: String(post._id),
    workoutId: String(workout._id),
    dietCard,
    territoryEvent,
    newBadges,
  });
}
