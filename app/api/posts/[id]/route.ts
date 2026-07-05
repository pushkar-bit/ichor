import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { DietCard } from "@/models/DietCard";
import { Comment } from "@/models/Comment";
import { CampusZone } from "@/models/CampusZone";
import "@/models/User";
import "@/models/Workout";
import { serializePost } from "@/lib/serialize";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { id } = await params;

  const post = await Post.findById(id).populate("userId").populate("workoutId").lean();
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [dietCard, commentCount, zone] = await Promise.all([
    DietCard.findOne({ postId: id }).lean(),
    Comment.countDocuments({ postId: id }),
    (post as any).locationZoneId ? CampusZone.findById((post as any).locationZoneId).lean() : null,
  ]);

  return NextResponse.json(
    serializePost(
      { ...post, dietCard, commentCount, zoneName: (zone as any)?.name ?? null },
      me ? String(me._id) : undefined,
    ),
  );
}
