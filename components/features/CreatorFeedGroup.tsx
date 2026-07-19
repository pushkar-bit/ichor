"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Gauge, Ruler, Swords, TrendingUp } from "lucide-react";
import { ActivityCard, type ActivityCardData } from "./ActivityCard";
import { summarizeCreatorGroup } from "@/lib/creatorGroupInsight";
import { formatPace } from "@/lib/utils";

const CARD_GAP_PX = 12; // matches gap-3

// One creator's recent posts, collapsed into a single slot in the feed so a person who's
// posted several workouts in a row doesn't occupy several slots. Latest workout leads; the
// rest are reachable by scrolling horizontally. Cards themselves are untouched ActivityCards,
// each sized just under full width so the next one visibly peeks in as a scroll hint.
export function CreatorFeedGroup({
  posts,
  globalMaxDistances,
}: {
  posts: ActivityCardData[];
  globalMaxDistances: Record<string, number>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const step = useCallback(() => {
    const el = scrollRef.current;
    const card = el?.firstElementChild as HTMLElement | undefined;
    return card ? card.offsetWidth + CARD_GAP_PX : 0;
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    const s = step();
    if (!el || !s) return;
    setActiveIndex(Math.round(el.scrollLeft / s));
  }, [step]);

  const goTo = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      const s = step();
      if (!el || !s) return;
      const clamped = Math.max(0, Math.min(posts.length - 1, index));
      setActiveIndex(clamped);
      el.scrollTo({ left: clamped * s, behavior: "smooth" });
    },
    [posts.length, step],
  );

  if (posts.length === 1) {
    const post = posts[0];
    return <ActivityCard post={post} maxDistance={globalMaxDistances[post.workout.activityType]} />;
  }

  const insight = summarizeCreatorGroup(posts);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < posts.length - 1;

  return (
    <div>
      {insight && (
        <div className="mb-2.5 flex flex-col gap-1.5 rounded-xl border border-border-ichor bg-midnight-raised px-3 py-2.5">
          {/* What they've recently done — a plain-language recap of the group's activity. */}
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
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {posts.map((post) => (
            <div key={post.id} className="w-[88%] sm:w-[85%] shrink-0 snap-start">
              <ActivityCard post={post} maxDistance={globalMaxDistances[post.workout.activityType]} />
            </div>
          ))}
        </div>

        {/* Edge fades + chevrons hint that there's more to swipe to, in either direction. */}
        {hasNext && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-midnight to-transparent" />
            <button
              type="button"
              aria-label="Next workout"
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        {hasPrev && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-midnight to-transparent" />
            <button
              type="button"
              aria-label="Previous workout"
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/20 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}

        <span className="pointer-events-none absolute top-4 right-4 sm:right-6 z-10 inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 bg-midnight/80 backdrop-blur px-2 py-1 rounded-full border border-border-ichor">
          {activeIndex + 1}/{posts.length} recent
        </span>
      </div>
    </div>
  );
}
