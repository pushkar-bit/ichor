import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";
import { Workout } from "@/models/Workout";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const post = await Post.findByIdAndUpdate(id, { flagCount: 0, isHidden: false, flaggedByUserIds: [] }, { new: true });
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  await Workout.findByIdAndUpdate(post.workoutId, { verificationStatus: "VERIFIED" });
  return NextResponse.json({ ok: true });
}
