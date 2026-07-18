import type { ActivityCardData } from "@/components/features/ActivityCard";
import { firstName } from "./postPersonalization";

// Rolls up per-post viewer personalization (already computed server-side in lib/feed.ts,
// null on the viewer's own posts) plus the group's own workout stats into one summary for a
// creator's whole group, so swiping through several of the same person's runs reads as one
// continuous story — what they've been up to, the numbers, and why it's worth your attention
// — instead of the same streak/head-to-head chips just repeating on every card.
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

function summarizeSpan(posts: ActivityCardData[]): string {
  const times = posts.map((p) => new Date(p.createdAt).getTime());
  const spanHours = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60);
  if (spanHours < 20) return "today";
  if (spanHours < 48) return "in the last 2 days";
  const days = Math.round(spanHours / 24);
  return days <= 9 ? `over the last ${days} days` : "over the past week+";
}

export function summarizeCreatorGroup(posts: ActivityCardData[]): CreatorGroupInsight | null {
  if (posts.length < 2) return null;

  const personalized = posts.map((p) => p.personalization).filter((p) => p != null);
  if (personalized.length === 0) return null; // the viewer's own group, or nothing to say

  const streakDays = personalized.find((p) => p.authorStreakDays)?.authorStreakDays ?? null;
  const headToHead = personalized.find((p) => p.headToHead)?.headToHead ?? null;

  const messages = personalized.map((p) => p.message).filter((m) => m != null);
  const message = messages.length
    ? messages.reduce((best, m) => (TONE_RANK[m.tone] < TONE_RANK[best.tone] ? m : best))
    : null;

  if (!streakDays && !headToHead && !message) return null;

  const activityTypes = new Set(posts.map((p) => p.workout.activityType));
  const activityLabel =
    activityTypes.size > 1
      ? "workouts"
      : posts[0].workout.activityType === "RUN"
        ? "runs"
        : posts[0].workout.activityType === "CYCLE"
          ? "rides"
          : "walks";

  const totalDistanceKm = posts.reduce((sum, p) => sum + p.workout.distanceKm, 0);
  const longestDistanceKm = Math.max(...posts.map((p) => p.workout.distanceKm));
  const paces = posts.map((p) => p.workout.avgPaceMinPerKm).filter((p): p is number => p != null);
  const bestPaceMinPerKm = paces.length ? Math.min(...paces) : null;

  return {
    name: firstName(posts[0].author.name),
    runCount: posts.length,
    activityLabel,
    spanLabel: summarizeSpan(posts),
    totalDistanceKm,
    bestPaceMinPerKm,
    longestDistanceKm,
    streakDays,
    headToHead,
    message,
  };
}
