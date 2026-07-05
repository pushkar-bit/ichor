import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import "@/models/Workout";
import { generateTrainingPlan } from "@/lib/ai";

export async function POST() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
  const posts = await Post.find({ userId: me._id, isHidden: false, createdAt: { $gte: fourWeeksAgo } })
    .populate("workoutId")
    .lean();

  const totalDistance = posts.reduce((s: number, p: any) => s + (p.workoutId?.distanceKm ?? 0), 0);
  const avgWeeklyDistanceKm = totalDistance / 4;

  const plan = generateTrainingPlan(avgWeeklyDistanceKm || 15);
  return NextResponse.json({ plan });
}
