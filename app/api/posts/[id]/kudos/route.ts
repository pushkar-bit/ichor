import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const already = (post.kudosUserIds ?? []).some((u: any) => String(u) === String(me._id));
  if (already) {
    post.kudosUserIds = post.kudosUserIds.filter((u: any) => String(u) !== String(me._id));
  } else {
    post.kudosUserIds = [...(post.kudosUserIds ?? []), me._id];
  }
  post.kudosCount = post.kudosUserIds.length;
  await post.save();

  return NextResponse.json({ kudosCount: post.kudosCount, given: !already });
}
