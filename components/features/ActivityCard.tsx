import Image from "next/image";
import Link from "next/link";
import { Footprints, Bike, Timer, Flame as FlameIcon, MapPin, MessageSquare, BadgeCheck, Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatChip } from "@/components/ui/StatChip";
import { FlamePicker } from "./FlamePicker";
import { KudosButton } from "./KudosButton";
import { timeAgo, formatPace, formatDuration } from "@/lib/utils";

export type ActivityCardData = {
  id: string;
  author: { name: string; avatarUrl?: string };
  createdAt: string;
  workout: {
    activityType: "RUN" | "WALK" | "CYCLE";
    distanceKm: number;
    durationSeconds: number;
    avgPaceMinPerKm: number | null;
    caloriesBurned: number;
    sourceType: string;
    screenshotUrl?: string | null;
  };
  photoUrls: string[];
  caption?: string;
  dietCard?: { classification: "CLEAN" | "CHEAT" | "NEUTRAL"; estimatedCalories: number | null } | null;
  avgFlameRating: number;
  flameCount: number;
  kudosCount: number;
  kudosGiven: boolean;
  commentCount: number;
  zoneName?: string | null;
  linkToDetail?: boolean;
};

const ACTIVITY_ICON = { RUN: Footprints, WALK: Footprints, CYCLE: Bike };

export function ActivityCard({ post }: { post: ActivityCardData }) {
  const ActivityIcon = ACTIVITY_ICON[post.workout.activityType];
  const isVerified = post.workout.sourceType === "HEALTH_SYNC";
  const isOcr = post.workout.sourceType === "OCR_SCREENSHOT";

  return (
    <article className="bg-midnight-raised border border-border-ichor rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <Avatar src={post.author.avatarUrl} name={post.author.name} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{post.author.name}</span>
            {isVerified && <BadgeCheck className="w-3.5 h-3.5 text-lime shrink-0" />}
            {isOcr && <Camera className="w-3.5 h-3.5 text-white/40 shrink-0" />}
          </div>
          <span className="text-xs text-white/40">{timeAgo(post.createdAt)}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-momentum bg-momentum/10 px-2 py-1 rounded-full">
          <ActivityIcon className="w-3 h-3" />
          {post.workout.activityType}
        </span>
      </div>

      {post.photoUrls[0] && (
        <div className="relative w-full aspect-video bg-midnight-card">
          <Image src={post.photoUrls[0]} alt="" fill unoptimized className="object-cover" />
          {post.zoneName && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] font-medium bg-black/60 backdrop-blur px-2 py-1 rounded-full">
              <MapPin className="w-3 h-3" /> {post.zoneName}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center px-4 py-3 border-b border-border-ichor">
        <StatChip label="Distance" value={`${post.workout.distanceKm}km`} />
        <StatChip label="Pace" value={formatPace(post.workout.avgPaceMinPerKm)} icon={<Timer className="w-3.5 h-3.5" />} />
        <StatChip label="Duration" value={formatDuration(post.workout.durationSeconds)} />
        <StatChip label="Calories" value={post.workout.caloriesBurned} icon={<FlameIcon className="w-3.5 h-3.5 text-ignite" />} />
      </div>

      {post.dietCard && (
        <div className="px-4 pt-3">
          <DietPill classification={post.dietCard.classification} estimatedCalories={post.dietCard.estimatedCalories} />
        </div>
      )}

      {post.caption && <p className="px-4 pt-3 text-sm text-white/80 leading-relaxed">{post.caption}</p>}

      <div className="flex items-center justify-between px-4 py-3 mt-1">
        <FlamePicker postId={post.id} initialAvg={post.avgFlameRating} initialCount={post.flameCount} />
        <div className="flex items-center gap-2">
          {post.linkToDetail !== false ? (
            <Link
              href={`/post/${post.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-border-ichor text-white/50 hover:text-white"
            >
              <MessageSquare className="w-3.5 h-3.5" /> {post.commentCount}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <MessageSquare className="w-3.5 h-3.5" /> {post.commentCount}
            </span>
          )}
          <KudosButton postId={post.id} initialCount={post.kudosCount} initialGiven={post.kudosGiven} />
        </div>
      </div>
    </article>
  );
}

export function DietPill({
  classification,
  estimatedCalories,
}: {
  classification: "CLEAN" | "CHEAT" | "NEUTRAL";
  estimatedCalories: number | null;
}) {
  const map = {
    CLEAN: { emoji: "🥗", label: "Clean Eat", cls: "bg-lime/15 text-lime border-lime/30" },
    CHEAT: { emoji: "🍕", label: "Cheat Day", cls: "bg-ignite/15 text-ignite border-ignite/30" },
    NEUTRAL: { emoji: "🍚", label: "Neutral", cls: "bg-white/10 text-white/60 border-white/20" },
  }[classification];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${map.cls}`}>
      <span>{map.emoji}</span>
      {map.label}
      {estimatedCalories ? <span className="opacity-70">· ~{estimatedCalories} cal</span> : null}
    </span>
  );
}
