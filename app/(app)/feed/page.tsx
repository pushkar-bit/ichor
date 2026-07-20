import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getFeedPosts } from "@/lib/feed";
import { getLeaderboardRows } from "@/lib/leaderboard";
import { getFollowSuggestions } from "@/lib/followSuggestions";
import { buildForYou } from "@/lib/forYou";
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

  // The For-You rail reuses the leaderboard we already fetched (for rank/rival cards) rather
  // than recomputing it. Computed to a plain array here and passed as props — never streamed
  // as an async RSC child (see the /feed reload-loop note in project memory).
  const forYou = await buildForYou(me, {
    leaderboard: (leaderboard?.rows as { userId: string; name: string; value: number; unit: string }[] | undefined) ?? null,
  });

  return (
    <FeedClient
      initialPosts={feed.posts as unknown as ActivityCardData[]}
      initialCursor={feed.nextCursor}
      initialGlobalMaxDistances={feed.globalMaxDistances}
      initialLeaderboardData={leaderboard ?? undefined}
      initialSuggestions={suggestions}
      forYou={forYou}
      stravaConnected={Boolean(me.stravaAthleteId)}
    />
  );
}
