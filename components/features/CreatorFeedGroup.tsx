"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Gauge, Ruler, Swords, TrendingUp } from "lucide-react";
import { ActivityCard, type ActivityCardData } from "./ActivityCard";
import { summarizeCreatorGroup, type CreatorGroupInsight } from "@/lib/creatorGroupInsight";
import { formatPace } from "@/lib/utils";

// One creator's slot in the feed for the current week — a single post renders as a plain
// ActivityCard; several posts collapse into one horizontally-scrollable slot instead of
// flooding the feed with repeats, navigated by a compact toolbar (not overlay buttons on
// top of the card, which crowded the post content). Every slot gets the same insight banner
// above it, whether it holds one post or several.
export function CreatorFeedGroup({
  posts,
  globalMaxDistances,
}: {
  posts: ActivityCardData[];
  globalMaxDistances: Record<string, number>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el || el.clientWidth === 0) return;
      const clamped = Math.max(0, Math.min(posts.length - 1, index));
      setActiveIndex(clamped);
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    },
    [posts.length],
  );

  const insight = summarizeCreatorGroup(posts);
  const hasMultiple = posts.length > 1;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < posts.length - 1;

  return (
    <div>
      {insight && <InsightBanner insight={insight} />}

      {hasMultiple && (
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-[11px] font-semibold text-white/40">
            {activeIndex + 1} of {posts.length} recent
          </span>
          <div className="flex items-center gap-1.5">
            <NavButton direction="prev" enabled={hasPrev} onClick={() => goTo(activeIndex - 1)} />
            <NavButton direction="next" enabled={hasNext} onClick={() => goTo(activeIndex + 1)} />
          </div>
        </div>
      )}

      {hasMultiple ? (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {posts.map((post) => (
            <div key={post.id} className="w-full shrink-0 snap-start">
              <ActivityCard post={post} maxDistance={globalMaxDistances[post.workout.activityType]} />
            </div>
          ))}
        </div>
      ) : (
        <ActivityCard post={posts[0]} maxDistance={globalMaxDistances[posts[0].workout.activityType]} />
      )}
    </div>
  );
}

function NavButton({
  direction,
  enabled,
  onClick,
}: {
  direction: "prev" | "next";
  enabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={direction === "prev" ? "Previous workout" : "Next workout"}
      disabled={!enabled}
      onClick={onClick}
      className={`flex items-center justify-center w-7 h-7 rounded-full border transition-colors ${
        enabled
          ? "border-border-ichor text-white hover:bg-white/10 cursor-pointer"
          : "border-white/10 text-white/15 cursor-not-allowed"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function InsightBanner({ insight }: { insight: CreatorGroupInsight }) {
  return (
    <div className="mb-2.5 flex flex-col gap-1.5 rounded-xl border border-border-ichor bg-midnight-raised px-3 py-2.5">
      {/* What they've recently done — a plain-language recap of the slot's activity. */}
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="text-xs font-bold">{insight.name}</span>
        <span className="text-[11px] text-white/50">
          logged {insight.runCount} {insight.activityLabel} {insight.spanLabel} · {insight.totalDistanceKm.toFixed(1)} km total
        </span>
      </div>

      {/* Their recent stat summary — the numbers behind that recap. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {insight.longestDistanceKm != null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 bg-white/5 px-2 py-0.5 rounded-full">
            <Ruler className="w-3 h-3" /> Longest {insight.longestDistanceKm.toFixed(1)} km
          </span>
        )}
        {insight.bestPaceMinPerKm != null && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 bg-white/5 px-2 py-0.5 rounded-full">
            <Gauge className="w-3 h-3" /> Best pace {formatPace(insight.bestPaceMinPerKm)}
          </span>
        )}
        {insight.streakDays && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ignite bg-ignite/10 px-2 py-0.5 rounded-full">
            <Flame className="w-3 h-3" /> {insight.streakDays}-day streak
          </span>
        )}
        {insight.headToHead && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 bg-white/5 px-2 py-0.5 rounded-full">
            <Swords className="w-3 h-3" />{" "}
            {insight.headToHead.wins > insight.headToHead.losses
              ? "You lead"
              : insight.headToHead.wins < insight.headToHead.losses
                ? "You trail"
                : "Even"}{" "}
            {insight.headToHead.wins}–{insight.headToHead.losses}
          </span>
        )}
      </div>

      {/* Why pay attention — the sharpest single nudge vs. your own bests. */}
      {insight.message && (
        <div
          className={`flex items-start gap-1.5 text-xs leading-snug rounded-lg px-2.5 py-1.5 ${
            insight.message.tone === "chase"
              ? "text-ignite bg-ignite/10"
              : insight.message.tone === "ahead"
                ? "text-lime bg-lime/10"
                : "text-white/60 bg-white/5"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{insight.message.text}</span>
        </div>
      )}
    </div>
  );
}
