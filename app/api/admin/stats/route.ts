import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Post } from "@/models/Post";
import { Workout } from "@/models/Workout";
import { Clan } from "@/models/Clan";

export async function GET() {
  await connectDB();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [totalUsers, postsToday, workoutsThisWeek, activeClanCount] = await Promise.all([
    User.countDocuments({}),
    Post.countDocuments({ createdAt: { $gte: startOfToday } }),
    Workout.countDocuments({ workoutDate: { $gte: weekAgo } }),
    Clan.countDocuments({}),
  ]);

  return NextResponse.json({ totalUsers, postsToday, workoutsThisWeek, activeClanCount });
}
