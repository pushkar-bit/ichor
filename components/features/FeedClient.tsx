"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, PlusCircle } from "lucide-react";
import { ActivityCard, type ActivityCardData } from "./ActivityCard";
import { ForYouRail } from "./ForYouRail";
import { LeaderboardWidget, type LeaderboardWidgetRow } from "./LeaderboardWidget";
import { FollowWidget } from "./FollowWidget";
import type { FollowSuggestion } from "@/lib/followSuggestions";
import type { ForYouCard } from "@/lib/forYou";
import { EmptyState, SkeletonCard } from "@/components/ui/StatChip";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All" },
  { key: "following", label: "Following" },
  { key: "clan", label: "Clan" },
  { key: "top", label: "Top Today" },
];

type FeedClientProps = {
  initialPosts?: ActivityCardData[];
  initialCursor?: string | null;
  initialGlobalMaxDistances?: Record<string, number>;
  initialLeaderboardData?: { rows: LeaderboardWidgetRow[]; me: string | null };
  initialSuggestions?: FollowSuggestion[];
  forYou?: ForYouCard[];
};

export function FeedClient({
  initialPosts,
  initialCursor = null,
  initialGlobalMaxDistances = {},
  initialLeaderboardData,
  initialSuggestions,
  forYou = [],
}: FeedClientProps) {
  const [tab, setTab] = useState("all");
  const [posts, setPosts] = useState<ActivityCardData[]>(initialPosts ?? []);
  const [globalMaxDistances, setGlobalMaxDistances] = useState<Record<string, number>>(initialGlobalMaxDistances);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(!initialPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts ? Boolean(initialCursor) : true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // The server already fetched the default "all" tab — skip the redundant client refetch that
  // would otherwise fire on mount and briefly flash a skeleton over content we already have.
  const skipNextLoad = useRef(Boolean(initialPosts));

  const load = useCallback(async (filter: string, cursorParam: string | null, replace: boolean) => {
    const params = new URLSearchParams({ filter });
    if (cursorParam) params.set("cursor", cursorParam);
    const res = await fetch(`/api/feed?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setPosts((prev) => (replace ? data.posts : [...prev, ...data.posts]));
    if (data.globalMaxDistances) {
      setGlobalMaxDistances(data.globalMaxDistances);
    }
    setCursor(data.nextCursor);
    setHasMore(Boolean(data.nextCursor));
  }, []);

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    setLoading(true);
    load(tab, null, true).finally(() => setLoading(false));
  }, [tab, load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true);
          load(tab, cursor, false).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tab, cursor, hasMore, loadingMore, loading, load]);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:pl-24 py-6 lg:flex lg:items-start lg:justify-center lg:gap-16">
      <div className="max-w-2xl w-full mx-auto lg:mx-0 lg:flex-1">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display italic font-bold text-3xl">Feed</h1>
          <Link
            href="/post/create"
            className="inline-flex items-center gap-1.5 bg-momentum text-midnight text-sm font-semibold px-3.5 py-2 rounded-full"
          >
            <PlusCircle className="w-4 h-4" /> Post
          </Link>
        </div>

        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors",
                tab === t.key ? "bg-momentum text-midnight" : "bg-midnight-raised text-white/50 hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* The personalized rail is viewer-specific, so it rides the default "all" view only —
            the filtered tabs (following/clan/top) are about other people's posts, not you. */}
        {tab === "all" && forYou.length > 0 && <ForYouRail cards={forYou} />}

        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Flame className="w-6 h-6" />}
            title="No posts yet"
            description="Be the first to import a workout and post it to the club."
            action={
              <Link href="/post/create" className="bg-momentum text-midnight text-sm font-semibold px-4 py-2 rounded-full">
                Create a post
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <ActivityCard key={post.id} post={post} maxDistance={globalMaxDistances[post.workout.activityType]} />
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && <SkeletonCard />}
          </div>
        )}
      </div>

      {/* Leaderboard rail — right-hand sticky rail on wide screens, stacked below the feed
          on narrow ones. Always rendered (never `hidden`) so it can't just fail to appear. */}
      <aside className="max-w-xl w-full mx-auto mt-8 lg:mt-32 lg:w-80 lg:max-w-none lg:shrink-0 lg:sticky lg:top-8">
        <LeaderboardWidget initialData={initialLeaderboardData} />
        <FollowWidget initialSuggestions={initialSuggestions} />
      </aside>
    </div>
  );
}
