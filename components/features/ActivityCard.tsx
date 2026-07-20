"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footprints, Bike, Timer, Flame as FlameIcon, MessageSquare, BadgeCheck, Camera, Swords, TrendingUp } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { RunVisualizer } from "./RunVisualizer";
import { PostImageCarousel } from "./PostImageCarousel";
import { ReactionBar } from "./ReactionBar";
import { ReactionSummary } from "./ReactionSummary";
import { timeAgo, formatPace, formatDuration } from "@/lib/utils";

import { motion } from "framer-motion";

export type ActivityCardData = {
  id: string;
  author: { id?: string; name: string; username?: string | null; avatarUrl?: string };
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
  reactionSummary?: { featuredName: string; featuredAvatarUrl: string; totalCount: number } | null;
  personalization?: import("@/lib/postPersonalization").PostPersonalization | null;
};

const ACTIVITY_ICON = { RUN: Footprints, WALK: Footprints, CYCLE: Bike };

// Every feed card gets the same media height whether or not it has a photo — otherwise a
// photo post and a caption-only post sit at very different heights right next to each other
// in the per-creator carousel, which reads as broken rather than just "no photo this time."
const FEED_MEDIA_HEIGHT_CLASS = "h-56 sm:h-72";

function FeedMediaPlaceholder({
  activityType,
  hue,
  onOpen,
}: {
  activityType: ActivityCardData["workout"]["activityType"];
  hue: number;
  onOpen?: () => void;
}) {
  const Icon = ACTIVITY_ICON[activityType];
  return (
    <div
      className={`relative w-full ${FEED_MEDIA_HEIGHT_CLASS} flex items-center justify-center overflow-hidden ${onOpen ? "cursor-pointer" : ""}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue}, 55%, 13%), var(--ichor-midnight))` }}
      onClick={onOpen}
    >
      <Icon className="w-16 h-16 sm:w-20 sm:h-20 opacity-20" style={{ color: `hsl(${hue}, 85%, 65%)` }} />
    </div>
  );
}

export function ActivityCard({ post, maxDistance }: { post: ActivityCardData; maxDistance?: number }) {
  const router = useRouter();
  const ActivityIcon = ACTIVITY_ICON[post.workout.activityType];
  const isVerified = post.workout.sourceType === "HEALTH_SYNC";
  const isOcr = post.workout.sourceType === "OCR_SCREENSHOT";
  const openDetail = () => {
    if (post.linkToDetail !== false) router.push(`/post/${post.id}`);
  };

  // Calculate width based on distance (cap at 100%)
  const fallbackMax = post.workout.activityType === "CYCLE" ? 40 : 15;
  const maxExpectedDistance = maxDistance || fallbackMax;
  const widthPercent = Math.min(100, Math.max(10, (post.workout.distanceKm / maxExpectedDistance) * 100));

  // Hue goes from 120 (Green) to 0 (Red) based on widthPercent
  const hue = Math.max(0, 120 - (widthPercent * 1.2));

  return (
    <motion.article 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-midnight-raised border-2 border-border-ichor rounded-none shadow-[6px_6px_0_var(--ichor-border)] overflow-hidden flex flex-col mb-10 transition-shadow hover:shadow-[10px_10px_0_var(--ichor-border)]"
    >
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
        {post.author.username ? (
          <Link href={`/profile/${post.author.username}`} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar src={post.author.avatarUrl} name={post.author.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[17px] tracking-tight truncate hover:underline">{post.author.name}</span>
                {isVerified && <BadgeCheck className="w-4 h-4 text-lime shrink-0" />}
                {isOcr && <Camera className="w-4 h-4 text-white/40 shrink-0" />}
                <span className="font-semibold text-[15px] text-white/50">· {timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </Link>
        ) : (
          <>
            <Avatar src={post.author.avatarUrl} name={post.author.name} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[17px] tracking-tight truncate">{post.author.name}</span>
                {isVerified && <BadgeCheck className="w-4 h-4 text-lime shrink-0" />}
                {isOcr && <Camera className="w-4 h-4 text-white/40 shrink-0" />}
                <span className="font-semibold text-[15px] text-white/50">· {timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-momentum bg-momentum/10 px-2 py-1 rounded-full">
          <ActivityIcon className="w-3 h-3" />
          {post.workout.activityType}
        </span>
      </div>

      {/* Viewer-specific personalization: how this run relates to YOU — the author's streak,
          your battle record with them, and a benchmark-vs-your-bests nudge. */}
      {post.personalization && (
        <div className="px-3 sm:px-4 pb-2.5 flex flex-col gap-1.5">
          {(post.personalization.authorStreakDays || post.personalization.headToHead) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {post.personalization.authorStreakDays && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ignite bg-ignite/10 px-2 py-0.5 rounded-full">
                  <FlameIcon className="w-3 h-3" /> {post.personalization.authorStreakDays}-day streak
                </span>
              )}
              {post.personalization.headToHead && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 bg-white/5 px-2 py-0.5 rounded-full">
                  <Swords className="w-3 h-3" />{" "}
                  {post.personalization.headToHead.wins > post.personalization.headToHead.losses
                    ? "You lead"
                    : post.personalization.headToHead.wins < post.personalization.headToHead.losses
                      ? "You trail"
                      : "Even"}{" "}
                  {post.personalization.headToHead.wins}–{post.personalization.headToHead.losses}
                </span>
              )}
            </div>
          )}
          {post.personalization.message && (
            <div
              className={`flex items-start gap-1.5 text-xs leading-snug rounded-lg px-2.5 py-1.5 ${
                post.personalization.message.tone === "chase"
                  ? "text-ignite bg-ignite/10"
                  : post.personalization.message.tone === "ahead"
                    ? "text-lime bg-lime/10"
                    : "text-white/60 bg-white/5"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{post.personalization.message.text}</span>
            </div>
          )}
        </div>
      )}

      {post.photoUrls.length > 0 ? (
        <PostImageCarousel
          photoUrls={post.photoUrls}
          zoneName={post.zoneName}
          onOpen={post.linkToDetail !== false ? openDetail : undefined}
          heightClass={FEED_MEDIA_HEIGHT_CLASS}
          fixedHeight
        />
      ) : (
        <FeedMediaPlaceholder
          activityType={post.workout.activityType}
          hue={hue}
          onOpen={post.linkToDetail !== false ? openDetail : undefined}
        />
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

      <div className="relative overflow-hidden flex px-3 sm:px-4 pt-2 pb-4 sm:pb-6 gap-3 sm:gap-4">
        {/* Absolute faint background glow for entire lower card */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] blur-3xl opacity-[0.06] rounded-full mix-blend-screen pointer-events-none transition-colors duration-1000"
          style={{ backgroundColor: `hsl(${hue}, 100%, 60%)` }}
        />

        <div
          className={`flex-1 min-w-0 relative z-10 ${post.linkToDetail !== false ? "cursor-pointer" : ""}`}
          onClick={openDetail}
        >
          <RunVisualizer
            activityType={post.workout.activityType}
            distanceKm={post.workout.distanceKm}
            durationSeconds={post.workout.durationSeconds}
            avgPaceMinPerKm={post.workout.avgPaceMinPerKm}
            caloriesBurned={post.workout.caloriesBurned}
            caption={post.caption}
          />

          {post.dietCard && (
            <div className="pt-3">
              <DietPill classification={post.dietCard.classification} estimatedCalories={post.dietCard.estimatedCalories} />
            </div>
          )}

          {post.reactionSummary && (
            <div className="pt-3" onClick={(e) => e.stopPropagation()}>
              <ReactionSummary postId={post.id} summary={post.reactionSummary} />
            </div>
          )}

          {/* Mobile action row: horizontal, full width, below the content. Swaps for the
              desktop sidebar below at sm+ via display toggling (not a flex-direction
              breakpoint swap, which some browsers failed to apply reliably here). */}
          <div className="flex sm:hidden items-stretch gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
            <ReactionBar
              layout="fill"
              postId={post.id}
              initialHype={{ count: post.hypeCount, given: post.hypeGiven }}
              initialRespect={{ count: post.respectCount, given: post.respectGiven }}
              initialChallenge={{ count: post.challengeCount, given: post.challengeGiven }}
            />
            {post.linkToDetail !== false ? (
              <Link
                href={`/post/${post.id}`}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 rounded-none border-2 border-border-ichor text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> {post.commentCount}
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2 text-white/50 border-2 border-transparent">
                <MessageSquare className="w-4 h-4" /> {post.commentCount}
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:flex sm:flex-col items-center gap-3 shrink-0 pt-6 w-20 md:w-24 relative z-10">
          <ReactionBar
            postId={post.id}
            initialHype={{ count: post.hypeCount, given: post.hypeGiven }}
            initialRespect={{ count: post.respectCount, given: post.respectGiven }}
            initialChallenge={{ count: post.challengeCount, given: post.challengeGiven }}
          />
          <motion.div
            className="w-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
          >
            {post.linkToDetail !== false ? (
              <Link
                href={`/post/${post.id}`}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold w-full py-2 rounded-none border-2 border-border-ichor text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <MessageSquare className="w-4 h-4" /> {post.commentCount}
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 text-sm font-bold w-full py-2 text-white/50 border-2 border-transparent">
                <MessageSquare className="w-4 h-4" /> {post.commentCount}
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </motion.article>
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
