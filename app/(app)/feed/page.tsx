import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getFeedPosts } from "@/lib/feed";
import { getLeaderboardRows } from "@/lib/leaderboard";
import { getFollowSuggestions } from "@/lib/followSuggestions";
import { FeedClient } from "@/components/features/FeedClient";
import type { ActivityCardData } from "@/components/features/ActivityCard";

export default async function FeedPage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;

  const [feed, leaderboard, suggestions] = await Promise.all([
    getFeedPosts(me, { filter: "all", cursor: null }),
    getLeaderboardRows("calories", "week", me),
    getFollowSuggestions(String(me._id), me.clanId, 15),
  ]);

  return (
    <FeedClient
      initialPosts={feed.posts as unknown as ActivityCardData[]}
      initialCursor={feed.nextCursor}
      initialGlobalMaxDistances={feed.globalMaxDistances}
      initialLeaderboardData={leaderboard ?? undefined}
      initialSuggestions={suggestions}
    />
  );
}
