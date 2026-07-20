import type { ActivityCardData } from "@/components/features/ActivityCard";
import { firstName } from "./postPersonalization";

// Rolls up per-post viewer personalization (already computed server-side in lib/feed.ts,
// null on the viewer's own posts) plus the group's own workout stats into one summary for a
// creator's whole slot on the feed — one per person per week, whether that's a single post
// or several — so every container gets the same "what they've been up to, the numbers, and
// why it's worth your attention" line above it, not just the ones with multiple posts.
export type CreatorGroupInsight = {
  name: string;
  runCount: number;
  activityLabel: string;
  spanLabel: string;
  totalDistanceKm: number;
  bestPaceMinPerKm: number | null;
  longestDistanceKm: number | null;
  streakDays: number | null;
  headToHead: { wins: number; losses: number } | null;
  message: { tone: "ahead" | "chase" | "neutral"; text: string } | null;
};

const TONE_RANK = { chase: 0, neutral: 1, ahead: 2 } as const;

// How long ago this person's earliest post in the slot went up, measured from now — not just
// the span between their own posts — so a single post from three days ago correctly reads
// "3 days ago" instead of always "today".
function summarizeRecency(posts: ActivityCardData[]): string {
  const oldest = Math.min(...posts.map((p) => new Date(p.createdAt).getTime()));
  const hoursAgo = (Date.now() - oldest) / (1000 * 60 * 60);
  if (hoursAgo < 20) return "today";
  if (hoursAgo < 48) return "since yesterday";
  const days = Math.min(7, Math.round(hoursAgo / 24));
  return `over the last ${days} days`;
}

export function summarizeCreatorGroup(posts: ActivityCardData[]): CreatorGroupInsight | null {
  const personalized = posts.map((p) => p.personalization).filter((p) => p != null);
  if (personalized.length === 0) return null; // the viewer's own slot, or nothing to say

  const streakDays = personalized.find((p) => p.authorStreakDays)?.authorStreakDays ?? null;
  const headToHead = personalized.find((p) => p.headToHead)?.headToHead ?? null;

  const messages = personalized.map((p) => p.message).filter((m) => m != null);
  const message = messages.length
    ? messages.reduce((best, m) => (TONE_RANK[m.tone] < TONE_RANK[best.tone] ? m : best))
    : null;

  if (!streakDays && !headToHead && !message) return null;

  const activityTypes = new Set(posts.map((p) => p.workout.activityType));
  const activityBase =
    activityTypes.size > 1
      ? "workout"
      : posts[0].workout.activityType === "RUN"
        ? "run"
        : posts[0].workout.activityType === "CYCLE"
          ? "ride"
          : "walk";
  const activityLabel = posts.length === 1 ? activityBase : `${activityBase}s`;

  const totalDistanceKm = posts.reduce((sum, p) => sum + p.workout.distanceKm, 0);
  const longestDistanceKm = Math.max(...posts.map((p) => p.workout.distanceKm));
  const paces = posts.map((p) => p.workout.avgPaceMinPerKm).filter((p): p is number => p != null);
  const bestPaceMinPerKm = paces.length ? Math.min(...paces) : null;

  return {
    name: firstName(posts[0].author.name),
    runCount: posts.length,
    activityLabel,
    spanLabel: summarizeRecency(posts),
    totalDistanceKm,
    bestPaceMinPerKm,
    longestDistanceKm,
    streakDays,
    headToHead,
    message,
  };
}
