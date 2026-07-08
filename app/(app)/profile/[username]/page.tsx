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

  const [zonesHeld, clan, posts] = await Promise.all([
    Territory.countDocuments({ ownerId: (user as any)._id }),
    (user as any).clanId ? Clan.findById((user as any).clanId).lean() : null,
    // photoUrls sliced to just the first photo (the grid never shows more) and workoutId
    // trimmed to the fields actually used — the full documents include a large base64
    // screenshotUrl per photo/workout that was previously fetched (twice — see below) for
    // nothing.
    Post.find({ userId: (user as any)._id, isHidden: false })
      .select({ photoUrls: { $slice: 1 }, workoutId: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .populate({ path: "workoutId", select: "activityType distanceKm avgPaceMinPerKm caloriesBurned workoutDate" })
      .lean(),
  ]);

  const heatmapData: Record<string, number> = {};
  for (const p of posts as any[]) {
    if (!p.workoutId) continue;
    const key = dayKey(new Date(p.workoutId.workoutDate));
    heatmapData[key] = (heatmapData[key] ?? 0) + (p.workoutId.caloriesBurned ?? 0);
  }
  // Reuses the workoutId data already fetched above instead of re-running the same
  // Post.find({userId}).populate("workoutId") query a second time just for these two numbers.
  const personalBests = getPersonalBests((posts as any[]).map((p) => p.workoutId));

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
