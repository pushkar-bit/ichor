"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Flame, PlusCircle } from "lucide-react";
import type { ActivityCardData } from "./ActivityCard";
import { CreatorFeedGroup } from "./CreatorFeedGroup";
import { ForYouRail, Lead as TopInsight } from "./ForYouRail";
import { StravaConnectNudge } from "./StravaConnectNudge";
import { LeaderboardWidget, type LeaderboardWidgetRow } from "./LeaderboardWidget";
import { FollowWidget } from "./FollowWidget";
import type { FollowSuggestion } from "@/lib/followSuggestions";
import type { ForYouCard } from "@/lib/forYou";
import { EmptyState, SkeletonCard } from "@/components/ui/StatChip";
import { cn, weekBucketKey } from "@/lib/utils";

const TABS = [
  { key: "foryou", label: "For You" },
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
  stravaConnected?: boolean;
};

export function FeedClient({
  initialPosts,
  initialCursor = null,
  initialGlobalMaxDistances = {},
  initialLeaderboardData,
  initialSuggestions,
  forYou = [],
  stravaConnected = false,
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
    // "For You" isn't a server-side post filter — it's the personalized cards already in
    // hand from props, so there's nothing to fetch and no post list to show underneath.
    if (tab === "foryou") return;
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

  // Collapse an author's posts from the CURRENT calendar week (Mon-Sun UTC, so the reset
  // instant is the same for every viewer) down to one slot, in first-appearance order (==
  // most-recent-post order, since posts arrive sorted newest-first) — so someone posting
  // several workouts in a row this week fills one horizontally-scrollable slot instead of
  // flooding the feed with repeats. Posts from an earlier week never join that slot — each
  // renders as its own standalone card, so the carousel only ever reflects "this week."
  const groups = useMemo(() => {
    const currentWeek = weekBucketKey(new Date());
    const order: string[] = [];
    const byKey = new Map<string, ActivityCardData[]>();
    for (const post of posts) {
      const authorKey = post.author.id ?? post.author.username ?? post.author.name;
      const key = weekBucketKey(post.createdAt) === currentWeek ? `${authorKey}:${currentWeek}` : post.id;
      if (!byKey.has(key)) {
        order.push(key);
        byKey.set(key, []);
      }
      byKey.get(key)!.push(post);
    }
    return order.map((key) => byKey.get(key)!);
  }, [posts]);

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

        {/* Account-level status, not tied to any one tab — shows regardless of which feed
            tab is active, unlike the per-tab dynamic insight banner below. */}
        <StravaConnectNudge connected={stravaConnected} />

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

        {/* The single highest-priority "For You" card, planted above the main feed tabs —
            the same ranked-by-the-moment engine that drives the dedicated tab, so whatever's
            most worth the viewer's attention right now (a streak on the line, a territory
            under attack, a pattern about to repeat) surfaces without a tab switch. Skipped on
            the "For You" tab itself, which already leads with this same card. */}
        {tab !== "foryou" && forYou.length > 0 && (
          <div className="mb-5">
            <TopInsight card={forYou[0]} onDismiss={() => {}} showDismiss={false} />
          </div>
        )}

        {tab === "foryou" ? (
          forYou.length > 0 ? (
            // Its own dedicated tab now, not an inline banner above the posts — so nothing
            // here needs to be dismissible; dismissal existed to declutter a shared view.
            <ForYouRail cards={forYou} dismissible={false} />
          ) : (
            <EmptyState
              icon={<Flame className="w-6 h-6" />}
              title="Nothing personalized yet"
              description="Log a run or two and this tab fills up with things relevant to you."
            />
          )
        ) : loading ? (
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
            {groups.map((group) => (
              <CreatorFeedGroup key={group[0].id} posts={group} globalMaxDistances={globalMaxDistances} />
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
