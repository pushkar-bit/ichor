import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { Comment } from "@/models/Comment";
import { CampusZone } from "@/models/CampusZone";
import { DietCard } from "@/models/DietCard";
import "@/models/User";
import "@/models/Workout";
import { serializePost } from "@/lib/serialize";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const filter = searchParams.get("filter") ?? "all";

  const query: Record<string, any> = { isPublic: true, isHidden: false };
  if (cursor) query.createdAt = { $lt: new Date(cursor) };

  if (filter === "clan" && me.clanId) {
    const { ClanMember } = await import("@/models/Clan");
    const memberDocs = await ClanMember.find({ clanId: me.clanId }).lean();
    query.userId = { $in: memberDocs.map((m: any) => m.userId) };
  } else if (filter === "following") {
    const kudosedPosts = await Post.find({ kudosUserIds: me._id }).select("userId").lean();
    const authorIds = [...new Set(kudosedPosts.map((p: any) => String(p.userId)))];
    query.userId = { $in: authorIds.length ? authorIds : [me._id] };
  } else if (filter === "top") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    query.createdAt = { ...(query.createdAt ?? {}), $gte: start };
  }

  let cursorQuery = Post.find(query)
    .sort(filter === "top" ? { avgFlameRating: -1, kudosCount: -1 } : { createdAt: -1 })
    .limit(PAGE_SIZE)
    .populate("userId")
    .populate("workoutId");

  const posts = await cursorQuery.lean();

  const postIds = posts.map((p: any) => p._id);
  const [dietCards, commentCounts, zones] = await Promise.all([
    DietCard.find({ postId: { $in: postIds } }).lean(),
    Comment.aggregate([{ $match: { postId: { $in: postIds } } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]),
    CampusZone.find({ _id: { $in: posts.map((p: any) => p.locationZoneId).filter(Boolean) } }).lean(),
  ]);

  const dietByPost = new Map(dietCards.map((d: any) => [String(d.postId), d]));
  const commentCountByPost = new Map(commentCounts.map((c: any) => [String(c._id), c.count]));
  const zoneById = new Map(zones.map((z: any) => [String(z._id), z.name]));

  const serialized = posts.map((p: any) =>
    serializePost(
      {
        ...p,
        dietCard: dietByPost.get(String(p._id)) ?? null,
        commentCount: commentCountByPost.get(String(p._id)) ?? 0,
        zoneName: p.locationZoneId ? zoneById.get(String(p.locationZoneId)) : null,
      },
      String(me._id),
    ),
  );

  const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].createdAt : null;

  return NextResponse.json({ posts: serialized, nextCursor });
}
