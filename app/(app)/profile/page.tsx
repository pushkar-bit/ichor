import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { Clan } from "@/models/Clan";
import "@/models/Workout";
import { dayKey } from "@/lib/week";
import { getPersonalBests } from "@/lib/personalBests";
import { getWeeklyRecap } from "@/lib/weeklyRecap";
import { getProfileTerritory } from "@/lib/territorySummary";
import { ProfileView } from "@/components/features/ProfileView";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;
  const { strava } = await searchParams;

  const [territory, clan, posts, weeklyRecap] = await Promise.all([
    getProfileTerritory(String(me._id)),
    me.clanId ? Clan.findById(me.clanId).lean() : null,
    // photoUrls sliced to just the first photo (the grid never shows more) and workoutId
    // trimmed to the fields actually used — the full documents include a large base64
    // screenshotUrl per photo/workout that was previously fetched (twice — see below) for
    // nothing.
    Post.find({ userId: me._id, isHidden: false })
      .select({ photoUrls: { $slice: 1 }, workoutId: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .populate({ path: "workoutId", select: "activityType distanceKm avgPaceMinPerKm caloriesBurned workoutDate" })
      .lean(),
    getWeeklyRecap(String(me._id)),
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
      user={me}
      isOwnProfile
      clan={clan}
      zonesHeld={territory.zonesHeld}
      territoryShapes={territory.shapes}
      territoryValuePoints={territory.valuePoints}
      longestHoldDays={territory.longestHoldDays}
      topDistrict={territory.topDistrict}
      posts={posts}
      heatmapData={heatmapData}
      personalBests={personalBests}
      stravaConnected={Boolean(me.stravaAthleteId)}
      stravaStatus={strava === "connected" || strava === "error" ? strava : undefined}
      weeklyRecap={weeklyRecap.distanceKm > 0 || weeklyRecap.calories > 0 ? weeklyRecap : null}
    />
  );
}
