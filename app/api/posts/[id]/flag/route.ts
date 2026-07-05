import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { Workout } from "@/models/Workout";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const already = (post.flaggedByUserIds ?? []).some((u: any) => String(u) === String(me._id));
  if (already) return NextResponse.json({ flagCount: post.flagCount, alreadyFlagged: true });

  post.flaggedByUserIds = [...(post.flaggedByUserIds ?? []), me._id];
  post.flagCount = post.flaggedByUserIds.length;

  if (post.flagCount >= 3) {
    post.isHidden = true;
    await Workout.findByIdAndUpdate(post.workoutId, { verificationStatus: "FLAGGED" });
  }
  await post.save();

  return NextResponse.json({ flagCount: post.flagCount, hidden: post.isHidden });
}
