import Link from "next/link";
import Image from "next/image";
import { Trophy, Flame, ShieldCheck, MapPin } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Post } from "@/models/Post";
import { Territory } from "@/models/Territory";
import { Clan } from "@/models/Clan";
import "@/models/Workout";
import { integrityTier } from "@/lib/scoring";
import { dayKey } from "@/lib/week";
import { BADGE_DEFS } from "@/lib/badges";
import { Avatar } from "@/components/ui/Avatar";
import { StatChip, EmptyState } from "@/components/ui/StatChip";
import { EditProfileModal } from "@/components/features/EditProfileModal";
import { TrainingPlanCard } from "@/components/features/TrainingPlanCard";
import { ActivityHeatmap } from "@/components/features/ActivityHeatmap";

export default async function ProfilePage() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return null;

  const [zonesHeld, clan, posts] = await Promise.all([
    Territory.countDocuments({ ownerId: me._id }),
    me.clanId ? Clan.findById(me.clanId).lean() : null,
    Post.find({ userId: me._id, isHidden: false }).sort({ createdAt: -1 }).populate("workoutId").lean(),
  ]);

  const heatmapData: Record<string, number> = {};
  for (const p of posts as any[]) {
    if (!p.workoutId) continue;
    const key = dayKey(new Date(p.workoutId.workoutDate));
    heatmapData[key] = (heatmapData[key] ?? 0) + (p.workoutId.caloriesBurned ?? 0);
  }

  const totalBattles = me.battlesWon + me.battlesLost;
  const winRatio = totalBattles > 0 ? me.battlesWon / totalBattles : 0;
  const tier = integrityTier(me.integrityPoints);
  const badges: string[] = me.badges ?? [];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
      {/* Hero */}
      <div className="flex items-center gap-4">
        <Avatar src={me.avatarUrl} name={me.name} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display italic font-bold text-2xl truncate">{me.name}</h1>
            {clan && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${(clan as any).color}30`, color: (clan as any).color }}
              >
                {(clan as any).tag}
              </span>
            )}
          </div>
          {me.bio && <p className="text-sm text-white/40 truncate">{me.bio}</p>}
        </div>
        <EditProfileModal initialName={me.name} initialBio={me.bio ?? ""} />
      </div>

      {/* Stats row */}
      <div className="flex bg-midnight-raised border border-border-ichor rounded-2xl py-4">
        <StatChip label="Total km" value={Math.round(me.totalDistanceKm)} />
        <StatChip label="Workouts" value={me.totalWorkouts} />
        <StatChip label="Calories" value={me.totalCalories} />
        <StatChip label="Zones Held" value={zonesHeld} icon={<MapPin className="w-3.5 h-3.5" />} />
      </div>

      {/* Battle record */}
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-2 flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Battle Record
        </h2>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-lime font-medium">{me.battlesWon}W</span>
          <span className="text-ignite font-medium">{me.battlesLost}L</span>
        </div>
        <div className="h-2 rounded-full bg-ignite/30 overflow-hidden">
          <div className="h-full bg-lime" style={{ width: `${winRatio * 100}%` }} />
        </div>
      </div>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 text-center">
          <Flame className="w-5 h-5 text-ignite mx-auto mb-1" />
          <div className="text-2xl font-bold">{me.streakDays}</div>
          <div className="text-[11px] text-white/40 uppercase tracking-wide">Current Streak</div>
        </div>
        <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 text-center">
          <Trophy className="w-5 h-5 text-lime mx-auto mb-1" />
          <div className="text-2xl font-bold">{me.bestStreakDays}</div>
          <div className="text-[11px] text-white/40 uppercase tracking-wide">Personal Best</div>
        </div>
      </div>

      {/* Integrity */}
      <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-momentum" />
        <div>
          <div className="text-sm font-semibold">{me.integrityPoints} Integrity Points</div>
          <div className="text-xs text-white/40">{tier} tier</div>
        </div>
      </div>

      {/* Training plan */}
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-2">Weekly Training Plan</h2>
        <TrainingPlanCard />
      </div>

      {/* Heatmap */}
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-2">Activity</h2>
        <ActivityHeatmap data={heatmapData} />
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-white/60 mb-2">Badges</h2>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
            {badges.map((b) => (
              <div key={b} className="shrink-0 flex flex-col items-center gap-1.5 w-20">
                <div className="w-12 h-12 rounded-2xl bg-momentum/15 flex items-center justify-center text-momentum">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-white/50 text-center leading-tight">{BADGE_DEFS[b]?.label ?? b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My posts */}
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-2">My Posts</h2>
        {posts.length === 0 ? (
          <EmptyState icon={<Flame className="w-6 h-6" />} title="No posts yet" description="Import a workout to get started." />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {posts.map((p: any) => (
              <Link key={String(p._id)} href={`/post/${p._id}`} className="relative aspect-square bg-midnight-card rounded-lg overflow-hidden">
                {p.photoUrls[0] && <Image src={p.photoUrls[0]} alt="" fill unoptimized className="object-cover" />}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
