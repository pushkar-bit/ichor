import Link from "next/link";
import Image from "next/image";
import { Trophy, Flame, ShieldCheck, MapPin, Gauge, Ruler } from "lucide-react";
import { integrityTier } from "@/lib/scoring";
import { BADGE_DEFS } from "@/lib/badges";
import { Avatar } from "@/components/ui/Avatar";
import { StatChip, EmptyState } from "@/components/ui/StatChip";
import { EditProfileModal } from "@/components/features/EditProfileModal";
import { TrainingPlanCard } from "@/components/features/TrainingPlanCard";
import { ActivityHeatmap } from "@/components/features/ActivityHeatmap";

type ProfileUser = {
  name: string;
  username?: string | null;
  avatarUrl: string;
  bio?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  totalDistanceKm: number;
  totalWorkouts: number;
  totalCalories: number;
  battlesWon: number;
  battlesLost: number;
  streakDays: number;
  bestStreakDays: number;
  integrityPoints: number;
  badges?: string[];
};

export function ProfileView({
  user,
  isOwnProfile,
  clan,
  zonesHeld,
  posts,
  heatmapData,
  personalBests,
}: {
  user: ProfileUser;
  isOwnProfile: boolean;
  clan: any | null;
  zonesHeld: number;
  posts: any[];
  heatmapData: Record<string, number>;
  personalBests: { best5kPaceMinPerKm: number | null; highestDistanceKm: number | null };
}) {
  const totalBattles = user.battlesWon + user.battlesLost;
  const winRatio = totalBattles > 0 ? user.battlesWon / totalBattles : 0;
  const tier = integrityTier(user.integrityPoints);
  const badges: string[] = user.badges ?? [];

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
      {/* Hero */}
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.name} size={64} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display italic font-bold text-2xl truncate">{user.name}</h1>
            {clan && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${(clan as any).color}30`, color: (clan as any).color }}
              >
                {(clan as any).tag}
              </span>
            )}
          </div>
          {user.username && <p className="text-sm text-white/40 truncate">@{user.username}</p>}
          {user.bio && <p className="text-sm text-white/40 truncate">{user.bio}</p>}
        </div>
        {isOwnProfile && (
          <EditProfileModal
            initialName={user.name}
            initialBio={user.bio ?? ""}
            initialUsername={user.username}
            initialAvatarUrl={user.avatarUrl}
            initialWeight={user.weightKg}
            initialHeight={user.heightCm}
          />
        )}
      </div>

      {/* Personal bests — highlighted headline stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-midnight-raised border border-momentum/30 rounded-2xl p-4 text-center">
          <Gauge className="w-5 h-5 text-momentum mx-auto mb-1" />
          <div className="font-display italic font-bold text-3xl">
            {personalBests.best5kPaceMinPerKm !== null ? personalBests.best5kPaceMinPerKm.toFixed(2) : "-"}
          </div>
          <div className="text-[11px] text-white/40 uppercase tracking-wide">Best 5K Pace (min/km)</div>
        </div>
        <div className="bg-midnight-raised border border-momentum/30 rounded-2xl p-4 text-center">
          <Ruler className="w-5 h-5 text-momentum mx-auto mb-1" />
          <div className="font-display italic font-bold text-3xl">
            {personalBests.highestDistanceKm !== null ? personalBests.highestDistanceKm.toFixed(2) : "-"}
          </div>
          <div className="text-[11px] text-white/40 uppercase tracking-wide">Highest Distance (km)</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex bg-midnight-raised border border-border-ichor rounded-2xl py-4">
        <StatChip label="Weight" value={user.weightKg ? `${user.weightKg}kg` : "-"} />
        <StatChip label="Height" value={user.heightCm ? `${user.heightCm}cm` : "-"} />
      </div>

      <div className="flex bg-midnight-raised border border-border-ichor rounded-2xl py-4">
        <StatChip label="Total km" value={Math.round(user.totalDistanceKm)} />
        <StatChip label="Workouts" value={user.totalWorkouts} />
        <StatChip label="Calories" value={user.totalCalories} />
        <StatChip label="Zones Held" value={zonesHeld} icon={<MapPin className="w-3.5 h-3.5" />} />
      </div>

      {/* Battle record */}
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-2 flex items-center gap-1.5">
          <Trophy className="w-4 h-4" /> Battle Record
        </h2>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-lime font-medium">{user.battlesWon}W</span>
          <span className="text-ignite font-medium">{user.battlesLost}L</span>
        </div>
        <div className="h-2 rounded-full bg-ignite/30 overflow-hidden">
          <div className="h-full bg-lime" style={{ width: `${winRatio * 100}%` }} />
        </div>
      </div>

      {/* Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 text-center">
          <Flame className="w-5 h-5 text-ignite mx-auto mb-1" />
          <div className="text-2xl font-bold">{user.streakDays}</div>
          <div className="text-[11px] text-white/40 uppercase tracking-wide">Current Streak</div>
        </div>
        <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 text-center">
          <Trophy className="w-5 h-5 text-lime mx-auto mb-1" />
          <div className="text-2xl font-bold">{user.bestStreakDays}</div>
          <div className="text-[11px] text-white/40 uppercase tracking-wide">Personal Best</div>
        </div>
      </div>

      {/* Integrity */}
      <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-momentum" />
        <div>
          <div className="text-sm font-semibold">{user.integrityPoints} Integrity Points</div>
          <div className="text-xs text-white/40">{tier} tier</div>
        </div>
      </div>

      {/* Training plan (own profile only) */}
      {isOwnProfile && (
        <div>
          <h2 className="font-semibold text-sm text-white/60 mb-2">Weekly Training Plan</h2>
          <TrainingPlanCard />
        </div>
      )}

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

      {/* Posts */}
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-2">{isOwnProfile ? "My Posts" : "Posts"}</h2>
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
