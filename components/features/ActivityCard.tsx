"use client";

import Image from "next/image";
import Link from "next/link";
import { Footprints, Bike, Timer, Flame as FlameIcon, MapPin, MessageSquare, BadgeCheck, Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { RunVisualizer } from "./RunVisualizer";
import { ReactionBar } from "./ReactionBar";
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
  hypeCount: number;
  hypeGiven: boolean;
  respectCount: number;
  respectGiven: boolean;
  challengeCount: number;
  challengeGiven: boolean;
  commentCount: number;
  zoneName?: string | null;
  linkToDetail?: boolean;
};

const ACTIVITY_ICON = { RUN: Footprints, WALK: Footprints, CYCLE: Bike };

export function ActivityCard({ post, maxDistance }: { post: ActivityCardData; maxDistance?: number }) {
  const ActivityIcon = ACTIVITY_ICON[post.workout.activityType];
  const isVerified = post.workout.sourceType === "HEALTH_SYNC";
  const isOcr = post.workout.sourceType === "OCR_SCREENSHOT";

  // Calculate width based on distance (cap at 100%)
  const fallbackMax = post.workout.activityType === "CYCLE" ? 40 : 15;
  const maxExpectedDistance = maxDistance || fallbackMax;
  const widthPercent = Math.min(100, Math.max(10, (post.workout.distanceKm / maxExpectedDistance) * 100));

  // Hue goes from 120 (Green) to 0 (Red) based on widthPercent
  const hue = Math.max(0, 120 - (widthPercent * 1.2));

  return (
    <article className="bg-midnight-raised border border-border-ichor rounded-2xl overflow-hidden flex flex-col">
      <style jsx>{`
        @keyframes zebra-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 28px 0; }
        }
        .zebra-bar {
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(255, 255, 255, 0.15),
            rgba(255, 255, 255, 0.15) 14px,
            transparent 14px,
            transparent 28px
          );
          background-size: 28px 28px;
          animation: zebra-scroll 1.5s linear infinite;
        }
      `}</style>
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

      {/* Full-width visual bar (straight edges) */}
      <div className="relative h-1 w-full bg-black/40 shadow-inner">
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out zebra-bar"
          style={{ 
            width: `${widthPercent}%`,
            backgroundColor: `hsl(${hue}, 85%, 50%)`,
            boxShadow: `0 0 10px hsl(${hue}, 85%, 50%, 0.5)`
          }}
        />
      </div>

      <RunVisualizer 
        activityType={post.workout.activityType}
        distanceKm={post.workout.distanceKm}
        durationSeconds={post.workout.durationSeconds}
        avgPaceMinPerKm={post.workout.avgPaceMinPerKm}
        caloriesBurned={post.workout.caloriesBurned}
      />

      {post.dietCard && (
        <div className="px-4 pt-3">
          <DietPill classification={post.dietCard.classification} estimatedCalories={post.dietCard.estimatedCalories} />
        </div>
      )}

      {post.caption && <p className="px-4 pt-3 text-sm text-white/80 leading-relaxed">{post.caption}</p>}

      <div className="flex items-center justify-between px-4 py-3 mt-1">
        <ReactionBar 
          postId={post.id}
          initialHype={{ count: post.hypeCount, given: post.hypeGiven }}
          initialRespect={{ count: post.respectCount, given: post.respectGiven }}
          initialChallenge={{ count: post.challengeCount, given: post.challengeGiven }}
        />
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
