import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { Comment } from "@/models/Comment";
import { Workout } from "@/models/Workout";
import { FlameRating } from "@/models/FlameRating";
import "@/models/User";
import { serializePost } from "@/lib/serialize";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { id } = await params;

  const post = await Post.findById(id).populate("userId").populate("workoutId").lean();
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [dietCard, commentCount] = await Promise.all([
    DietCard.findOne({ postId: id }).lean(),
    Comment.countDocuments({ postId: id }),
  ]);

  return NextResponse.json(
    serializePost({ ...post, dietCard, commentCount, zoneName: null }, me ? String(me._id) : undefined),
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(post.userId) !== String(me._id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { caption } = await req.json();
  if (typeof caption !== "string") {
    return NextResponse.json({ error: "caption must be a string" }, { status: 400 });
  }

  post.caption = caption.slice(0, 300);
  await post.save();

  return NextResponse.json({ ok: true, caption: post.caption });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const post = await Post.findById(id).lean();
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String((post as any).userId) !== String(me._id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Cascade delete all associated data
  await Promise.all([
    Post.deleteOne({ _id: id }),
    Workout.deleteOne({ _id: (post as any).workoutId }),
    DietCard.deleteMany({ postId: id }),
    Comment.deleteMany({ postId: id }),
    FlameRating.deleteMany({ postId: id }),
  ]);

  return NextResponse.json({ ok: true });
}
