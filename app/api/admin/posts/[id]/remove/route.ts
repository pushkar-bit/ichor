import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Post } from "@/models/Post";
import { Workout } from "@/models/Workout";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  await Workout.findByIdAndDelete(post.workoutId);
  await Post.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
