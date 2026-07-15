"use client";

/**
 * DEV-ONLY visual demo of the personalized feed pass — the For-You rail and per-post
 * personalization — mounted with fixture data so it renders without auth or a seeded DB.
 * Not linked anywhere; safe to delete.
 */

import { ForYouRail } from "@/components/features/ForYouRail";
import { ActivityCard, type ActivityCardData } from "@/components/features/ActivityCard";
import type { ForYouCard } from "@/lib/forYou";

const inHours = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();

const heatmapDays = Array.from({ length: 84 }, (_, i) => {
  const date = new Date(Date.now() - (83 - i) * 86400e3).toISOString().slice(0, 10);
  const r = Math.sin(i * 1.3) * 0.5 + 0.5; // deterministic pseudo-pattern
  const level = i % 5 === 0 ? 0 : Math.min(4, Math.round(r * 4));
  return { date, level };
});

const CARDS: ForYouCard[] = [
  { kind: "under_attack", id: "c1", priority: 120, battleId: "b1", territoryName: "Your Ridge Loop", opponentName: "A rival", respondBy: inHours(40) },
  { kind: "post_run_kudos", id: "c2", priority: 96, distanceKm: 5.2, paceMinPerKm: 4.9, headline: "That was quick 🔥", detail: "5.20 km at 4:54/km — 12s/km faster than your recent average.", isPB: false },
  { kind: "streak", id: "c3", priority: 98, streakDays: 8, atRisk: true, freezes: 1 },
  { kind: "weekly", id: "c4", priority: 66, distanceKm: 23.4, runs: 4, calories: 1680, bestPaceMinPerKm: 4.8, vsLastWeekPct: 18 },
  { kind: "heatmap", id: "c5", priority: 40, days: heatmapDays, totalDays: 47 },
  { kind: "rival", id: "c6", priority: 56, rivalName: "Aarav", metric: "points", gapText: "120 pts behind — one good session closes it.", behindBy: 120 },
  { kind: "milestone", id: "c7", priority: 60, label: "500 km all-time", remainingKm: 6.2, targetKm: 500 },
  { kind: "coach_tip", id: "c8", priority: 46, text: "Your cadence dips on climbs — try shorter, quicker steps on the next hilly route." },
  { kind: "percentile", id: "c9", priority: 58, percentile: 78, metric: "distance", sampleSize: 34 },
  { kind: "best_time", id: "c10", priority: 47, timeLabel: "morning", paceGapSeconds: 14 },
  { kind: "skip_risk", id: "c11", priority: 84, dayName: "Thursday", missRatePct: 80 },
  {
    kind: "race_predictor", id: "c12", priority: 44, basedOnKm: 5.2,
    predictions: [
      { label: "5K", time: "24:10" },
      { label: "10K", time: "50:12" },
      { label: "Half Marathon", time: "1:51:40" },
      { label: "Marathon", time: "3:52:05" },
    ],
  },
  { kind: "goal_projection", id: "c13", priority: 42, targetKm: 1000, etaDate: new Date(Date.now() + 47 * 86400e3).toISOString() },
];

function makePost(over: Partial<ActivityCardData> & Pick<ActivityCardData, "id">): ActivityCardData {
  return {
    author: { name: "Aarav Sharma", username: "aarav", avatarUrl: "" },
    createdAt: inHours(-2),
    workout: { activityType: "RUN", distanceKm: 5.05, durationSeconds: 1440, avgPaceMinPerKm: 4.75, caloriesBurned: 410, sourceType: "HEALTH_SYNC", screenshotUrl: null },
    photoUrls: [],
    caption: "Morning tempo around the park 🏃",
    dietCard: null,
    hypeCount: 12, hypeGiven: false, respectCount: 4, respectGiven: false, challengeCount: 1, challengeGiven: false,
    commentCount: 3, zoneName: null, linkToDetail: false, reactionSummary: null,
    ...over,
  };
}

const POST_CHASE = makePost({
  id: "p1",
  personalization: {
    authorStreakDays: 22,
    headToHead: { wins: 2, losses: 1 },
    message: { tone: "chase", text: "Aarav's 5K pace is 18s/km faster than your PB. Shave ~3s/km over your next 3 runs to close half the gap." },
  },
});

const POST_AHEAD = makePost({
  id: "p2",
  author: { name: "Meera Nair", username: "meera", avatarUrl: "" },
  workout: { activityType: "RUN", distanceKm: 5.1, durationSeconds: 1710, avgPaceMinPerKm: 5.6, caloriesBurned: 380, sourceType: "HEALTH_SYNC", screenshotUrl: null },
  caption: "Easy recovery jog",
  personalization: {
    authorStreakDays: 5,
    headToHead: null,
    message: { tone: "ahead", text: "Your 5K PB is 22s/km faster than this run — you've got the edge here." },
  },
});

export default function FeedDemoPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-white">
      <h1 className="font-display italic font-bold text-3xl mb-1">Feed personalization demo</h1>
      <p className="text-xs text-white/40 mb-6">Real components, fixture data — the For-You rail + per-post personalization.</p>

      <ForYouRail cards={CARDS} />

      <div className="flex items-center gap-1.5 mb-2.5">
        <h2 className="text-sm font-semibold text-white/60">Posts with viewer-specific personalization</h2>
      </div>
      <div className="space-y-4">
        <ActivityCard post={POST_CHASE} maxDistance={12} />
        <ActivityCard post={POST_AHEAD} maxDistance={12} />
      </div>
    </div>
  );
}
