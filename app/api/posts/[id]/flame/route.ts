import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { FlameRating } from "@/models/FlameRating";
import { Post } from "@/models/Post";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const { rating } = await req.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }

  await FlameRating.findOneAndUpdate(
    { postId: id, userId: me._id },
    { rating },
    { upsert: true, new: true },
  );

  const all = await FlameRating.find({ postId: id }).lean();
  const avg = all.reduce((s, r: any) => s + r.rating, 0) / all.length;

  const post = await Post.findByIdAndUpdate(
    id,
    { avgFlameRating: Math.round(avg * 10) / 10, flameCount: all.length },
    { new: true },
  );

  return NextResponse.json({ avgFlameRating: post?.avgFlameRating, flameCount: post?.flameCount });
}
