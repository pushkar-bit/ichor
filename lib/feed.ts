import { Post } from "@/models/Post";
import { Comment } from "@/models/Comment";
import { CampusZone } from "@/models/CampusZone";
import { DietCard } from "@/models/DietCard";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
import { serializePost } from "./serialize";
import { getInterestSets, combineReactorIds, pickFeaturedReactorId } from "./reactionSummary";

const PAGE_SIZE = 20;

export async function getFeedPosts(
  viewer: { _id: unknown; clanId?: unknown },
  { filter, cursor }: { filter: string; cursor: string | null },
) {
  const query: Record<string, any> = { isPublic: true, isHidden: false };
  if (cursor) query.createdAt = { $lt: new Date(cursor) };

  if (filter === "clan" && viewer.clanId) {
    const { ClanMember } = await import("@/models/Clan");
    const memberDocs = await ClanMember.find({ clanId: viewer.clanId }).lean();
    query.userId = { $in: memberDocs.map((m: any) => m.userId) };
  } else if (filter === "following") {
    const hypedPosts = await Post.find({ hypeUserIds: viewer._id }).select("userId").lean();
    const authorIds = [...new Set(hypedPosts.map((p: any) => String(p.userId)))];
    query.userId = { $in: authorIds.length ? authorIds : [viewer._id] };
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
  const [dietCards, commentCounts, zones, maxAgg, interestSets] = await Promise.all([
    DietCard.find({ postId: { $in: postIds } }).select("postId classification estimatedCalories").lean(),
    Comment.aggregate([{ $match: { postId: { $in: postIds } } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]),
    CampusZone.find({ _id: { $in: posts.map((p: any) => p.locationZoneId).filter(Boolean) } }).select("name").lean(),
    Workout.aggregate([{ $group: { _id: "$activityType", maxDist: { $max: "$distanceKm" } } }]),
    getInterestSets(String(viewer._id), viewer.clanId),
  ]);

  const dietByPost = new Map(dietCards.map((d: any) => [String(d.postId), d]));
  const commentCountByPost = new Map(commentCounts.map((c: any) => [String(c._id), c.count]));
  const zoneById = new Map(zones.map((z: any) => [String(z._id), z.name]));
  const globalMaxDistances: Record<string, number> = {};
  for (const agg of maxAgg) globalMaxDistances[agg._id] = agg.maxDist;

  // "Liked by X and N others" — pick a featured reactor per post using the viewer's interest
  // signals computed once above, then batch-fetch just the featured users' name/avatar.
  const reactorIdsByPost = new Map(posts.map((p: any) => [String(p._id), combineReactorIds(p)]));
  const featuredIdByPost = new Map<string, string | null>();
  const allFeaturedIds = new Set<string>();
  for (const [postId, reactorIds] of reactorIdsByPost) {
    const featuredId = pickFeaturedReactorId(reactorIds, interestSets, String(viewer._id));
    featuredIdByPost.set(postId, featuredId);
    if (featuredId) allFeaturedIds.add(featuredId);
  }
  const featuredUsers = await User.find({ _id: { $in: [...allFeaturedIds] } }).select("name avatarUrl").lean();
  const featuredUserById = new Map(featuredUsers.map((u: any) => [String(u._id), u]));

  const serialized = posts.map((p: any) => {
    const postId = String(p._id);
    const reactorIds = reactorIdsByPost.get(postId) ?? [];
    const featuredId = featuredIdByPost.get(postId);
    const featuredUser = featuredId ? featuredUserById.get(featuredId) : null;
    const reactionSummary =
      reactorIds.length > 0
        ? {
            featuredName: featuredId === String(viewer._id) ? "You" : (featuredUser?.name ?? "Athlete"),
            featuredAvatarUrl: featuredUser?.avatarUrl ?? "",
            totalCount: reactorIds.length,
          }
        : null;
    return serializePost(
      {
        ...p,
        dietCard: dietByPost.get(postId) ?? null,
        commentCount: commentCountByPost.get(postId) ?? 0,
        zoneName: p.locationZoneId ? zoneById.get(String(p.locationZoneId)) : null,
        reactionSummary,
      },
      String(viewer._id),
    );
  });

  const nextCursor = filter !== "top" && posts.length === PAGE_SIZE ? posts[posts.length - 1].createdAt : null;

  return { posts: serialized, nextCursor, globalMaxDistances };
}
