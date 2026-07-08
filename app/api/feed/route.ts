import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { Comment } from "@/models/Comment";
import { CampusZone } from "@/models/CampusZone";
import { DietCard } from "@/models/DietCard";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
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
    const hypedPosts = await Post.find({ hypeUserIds: me._id }).select("userId").lean();
    const authorIds = [...new Set(hypedPosts.map((p: any) => String(p.userId)))];
    query.userId = { $in: authorIds.length ? authorIds : [me._id] };
  } else if (filter === "top") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    query.createdAt = { ...(query.createdAt ?? {}), $gte: start };
  }

  const cursorQuery = Post.find(query)
    .sort(filter === "top" ? { hypeCount: -1, respectCount: -1 } : { createdAt: -1 })
    .limit(filter === "top" ? 50 : PAGE_SIZE)
    .populate({ path: "userId", select: "name username avatarUrl" })
    .populate({ path: "workoutId", select: "activityType distanceKm durationSeconds avgPaceMinPerKm caloriesBurned heartRateAvg workoutDate sourceType verificationStatus" });

  const posts = await cursorQuery.lean();

  const postIds = posts.map((p: any) => p._id);
  const [dietCards, commentCounts, zones, maxAgg] = await Promise.all([
    DietCard.find({ postId: { $in: postIds } }).select("postId classification estimatedCalories").lean(),
    Comment.aggregate([{ $match: { postId: { $in: postIds } } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]),
    CampusZone.find({ _id: { $in: posts.map((p: any) => p.locationZoneId).filter(Boolean) } }).select("name").lean(),
    Workout.aggregate([{ $group: { _id: "$activityType", maxDist: { $max: "$distanceKm" } } }]),
  ]);

  const dietByPost = new Map(dietCards.map((d: any) => [String(d.postId), d]));
  const commentCountByPost = new Map(commentCounts.map((c: any) => [String(c._id), c.count]));
  const zoneById = new Map(zones.map((z: any) => [String(z._id), z.name]));
  const globalMaxDistances: Record<string, number> = {};
  for (const agg of maxAgg) globalMaxDistances[agg._id] = agg.maxDist;

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

  const nextCursor = filter !== "top" && posts.length === PAGE_SIZE ? posts[posts.length - 1].createdAt : null;

  return NextResponse.json({ posts: serialized, nextCursor, globalMaxDistances });
}
