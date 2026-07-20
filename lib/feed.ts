import { Post } from "@/models/Post";
import { Comment } from "@/models/Comment";
import { DietCard } from "@/models/DietCard";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
import { Follow } from "@/models/Follow";
import { Battle } from "@/models/Battle";
import { serializePost } from "./serialize";
import { getInterestSets, combineReactorIds, pickFeaturedReactorId } from "./reactionSummary";
import { getPersonalBests } from "./personalBests";
import { personalizePost } from "./postPersonalization";
import { startOfWeekUTC } from "./utils";

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
    const followed = await Follow.find({ followerId: viewer._id }).select("followingId").lean();
    const authorIds = followed.map((f: any) => String(f.followingId));
    query.userId = { $in: [...authorIds, String(viewer._id)] };
  } else if (filter === "top") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    query.createdAt = { ...(query.createdAt ?? {}), $gte: start };
  }

  // The main feed tabs (all/following/clan) are scoped to the current calendar week — the
  // same Mon-Sun UTC boundary the per-creator carousel grouping resets on client-side — so
  // older posts don't just fall out of grouping, they don't appear on the feed at all. Once
  // a page's results run dry within the week, `posts.length < PAGE_SIZE` below naturally
  // nulls out nextCursor and infinite scroll stops, rather than crossing into last week.
  if (filter !== "top") {
    query.createdAt = { ...(query.createdAt ?? {}), $gte: startOfWeekUTC() };
  }

  const cursorQuery = Post.find(query)
    .sort(filter === "top" ? { hypeCount: -1, respectCount: -1 } : { createdAt: -1 })
    .limit(filter === "top" ? 50 : PAGE_SIZE)
    .populate({ path: "userId", select: "name username avatarUrl streakDays" })
    .populate({ path: "workoutId", select: "activityType distanceKm durationSeconds avgPaceMinPerKm caloriesBurned heartRateAvg workoutDate sourceType verificationStatus" });

  const posts = await cursorQuery.lean();

  const postIds = posts.map((p: any) => p._id);
  const [dietCards, commentCounts, maxAgg, interestSets] = await Promise.all([
    DietCard.find({ postId: { $in: postIds } }).select("postId classification estimatedCalories").lean(),
    Comment.aggregate([{ $match: { postId: { $in: postIds } } }, { $group: { _id: "$postId", count: { $sum: 1 } } }]),
    Workout.aggregate([{ $group: { _id: "$activityType", maxDist: { $max: "$distanceKm" } } }]),
    getInterestSets(String(viewer._id), viewer.clanId),
  ]);

  const dietByPost = new Map(dietCards.map((d: any) => [String(d.postId), d]));
  const commentCountByPost = new Map(commentCounts.map((c: any) => [String(c._id), c.count]));
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

  // Per-post personalization inputs, gathered once for the whole page:
  //  - the viewer's PBs (to benchmark each post's run against),
  //  - a batched head-to-head battle tally against every author in view.
  const viewerId = String(viewer._id);
  const authorIds = [...new Set(posts.map((p: any) => String(p.userId?._id)).filter((aid) => aid && aid !== viewerId))];
  const [viewerRuns, h2hBattles] = await Promise.all([
    Workout.find({ userId: viewer._id, activityType: "RUN" }).select("distanceKm avgPaceMinPerKm activityType").lean(),
    authorIds.length
      ? Battle.find({
          status: "RESOLVED",
          winnerId: { $ne: null },
          $or: [
            { attackerId: viewer._id, defenderId: { $in: authorIds } },
            { defenderId: viewer._id, attackerId: { $in: authorIds } },
          ],
        }).select("attackerId defenderId winnerId").lean()
      : Promise.resolve([]),
  ]);
  const viewerBests = getPersonalBests(viewerRuns as any);
  const h2hByAuthor = new Map<string, { wins: number; losses: number }>();
  for (const b of h2hBattles as any[]) {
    const opponentId = String(b.attackerId) === viewerId ? String(b.defenderId) : String(b.attackerId);
    const rec = h2hByAuthor.get(opponentId) ?? { wins: 0, losses: 0 };
    if (String(b.winnerId) === viewerId) rec.wins++;
    else rec.losses++;
    h2hByAuthor.set(opponentId, rec);
  }

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
    const author = p.userId;
    const authorId = String(author?._id);
    const personalization = personalizePost({
      authorName: author?.name ?? "Athlete",
      authorStreakDays: author?.streakDays ?? null,
      viewerBests,
      workout: {
        activityType: p.workoutId?.activityType ?? "RUN",
        distanceKm: p.workoutId?.distanceKm ?? 0,
        avgPaceMinPerKm: p.workoutId?.avgPaceMinPerKm ?? null,
      },
      headToHead: h2hByAuthor.get(authorId) ?? null,
      isOwnPost: authorId === viewerId,
    });
    return {
      ...serializePost(
        {
          ...p,
          dietCard: dietByPost.get(postId) ?? null,
          commentCount: commentCountByPost.get(postId) ?? 0,
          reactionSummary,
        },
        viewerId,
      ),
      personalization,
    };
  });

  const nextCursor = filter !== "top" && posts.length === PAGE_SIZE ? posts[posts.length - 1].createdAt : null;

  return { posts: serialized, nextCursor, globalMaxDistances };
}
