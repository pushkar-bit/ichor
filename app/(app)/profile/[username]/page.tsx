import { redirect, notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";
import { Post } from "@/models/Post";
import { Territory } from "@/models/Territory";
import { Clan } from "@/models/Clan";
import "@/models/Workout";
import { dayKey } from "@/lib/week";
import { getPersonalBests } from "@/lib/personalBests";
import { ProfileView } from "@/components/features/ProfileView";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  await connectDB();
  const { username } = await params;
  const me = await getOrCreateCurrentUser();

  if (me?.username === username) redirect("/profile");

  const user = await User.findOne({ username }).lean();
  if (!user) notFound();

  const [zonesHeld, clan, posts, personalBests] = await Promise.all([
    Territory.countDocuments({ ownerId: (user as any)._id }),
    (user as any).clanId ? Clan.findById((user as any).clanId).lean() : null,
    Post.find({ userId: (user as any)._id, isHidden: false }).sort({ createdAt: -1 }).populate("workoutId").lean(),
    getPersonalBests(String((user as any)._id)),
  ]);

  const heatmapData: Record<string, number> = {};
  for (const p of posts as any[]) {
    if (!p.workoutId) continue;
    const key = dayKey(new Date(p.workoutId.workoutDate));
    heatmapData[key] = (heatmapData[key] ?? 0) + (p.workoutId.caloriesBurned ?? 0);
  }

  return (
    <ProfileView
      user={user as any}
      isOwnProfile={false}
      clan={clan}
      zonesHeld={zonesHeld}
      posts={posts}
      heatmapData={heatmapData}
      personalBests={personalBests}
    />
  );
}
