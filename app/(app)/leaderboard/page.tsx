import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getLeaderboardRows } from "@/lib/leaderboard";
import { LeaderboardClient } from "@/components/features/LeaderboardClient";

export default async function LeaderboardPage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const data = await getLeaderboardRows("calories", "week", me);

  return <LeaderboardClient initialData={data ?? undefined} />;
}
