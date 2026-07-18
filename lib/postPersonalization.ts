import { FIVE_K_BAND, TEN_K_BAND } from "./personalBests";

/**
 * The viewer-specific overlay on someone else's feed post. Turns a stranger's run into a
 * personal signal: are they on a tear, have you two battled, and — the motivating part — where
 * this run sits versus YOUR bests, with an exact, reachable way to close any gap.
 *
 * Pure and cheap: the feed passes in the viewer's precomputed bests, the author's streak, and a
 * batched head-to-head tally, so no per-post DB work happens here.
 */

export type PostPersonalization = {
  authorStreakDays: number | null;
  headToHead: { wins: number; losses: number } | null;
  message: { tone: "ahead" | "chase" | "neutral"; text: string } | null;
};

type ViewerBests = {
  best5kPaceMinPerKm: number | null;
  best10kPaceMinPerKm: number | null;
  highestDistanceKm: number | null;
};

type PostWorkout = { activityType: string; distanceKm: number; avgPaceMinPerKm: number | null };

const STREAK_FLAIR_MIN = 3;

function inBand(km: number, band: { min: number; max: number }) {
  return km >= band.min && km <= band.max;
}
function paceGapSeconds(a: number, b: number) {
  return Math.round(Math.abs(a - b) * 60);
}
export function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

export function personalizePost(args: {
  authorName: string;
  authorStreakDays: number | null;
  viewerBests: ViewerBests;
  workout: PostWorkout;
  headToHead: { wins: number; losses: number } | null;
  isOwnPost: boolean;
}): PostPersonalization | null {
  const { authorName, authorStreakDays, viewerBests, workout, headToHead, isOwnPost } = args;
  if (isOwnPost) return null;

  const name = firstName(authorName);
  const message = buildMessage(name, viewerBests, workout);

  const authorStreak = authorStreakDays && authorStreakDays >= STREAK_FLAIR_MIN ? authorStreakDays : null;
  const h2h = headToHead && headToHead.wins + headToHead.losses > 0 ? headToHead : null;

  if (!authorStreak && !h2h && !message) return null;
  return { authorStreakDays: authorStreak, headToHead: h2h, message };
}

function buildMessage(
  name: string,
  bests: ViewerBests,
  workout: PostWorkout,
): { tone: "ahead" | "chase" | "neutral"; text: string } | null {
  if (workout.activityType !== "RUN") return null;
  const pace = workout.avgPaceMinPerKm;

  // Pace comparison when the run lands in a band we hold a PB for — the most meaningful head-to-head.
  const band = inBand(workout.distanceKm, FIVE_K_BAND)
    ? { pb: bests.best5kPaceMinPerKm, label: "5K" }
    : inBand(workout.distanceKm, TEN_K_BAND)
      ? { pb: bests.best10kPaceMinPerKm, label: "10K" }
      : null;

  if (pace != null && band && band.pb != null) {
    const gap = paceGapSeconds(pace, band.pb);
    if (pace < band.pb && gap >= 3) {
      // They're faster — turn it into a concrete, reachable plan.
      const perRun = Math.max(2, Math.round(gap / 6));
      return {
        tone: "chase",
        text: `${name}'s ${band.label} pace is ${gap}s/km faster than your PB. Shave ~${perRun}s/km over your next 3 runs to close half the gap.`,
      };
    }
    if (pace > band.pb && gap >= 3) {
      return { tone: "ahead", text: `Your ${band.label} PB is ${gap}s/km faster than this run — you've got the edge here.` };
    }
    return { tone: "neutral", text: `Dead even with your ${band.label} PB pace — you two would make great training partners.` };
  }

  // Distance comparison otherwise.
  if (bests.highestDistanceKm != null && workout.distanceKm > bests.highestDistanceKm + 0.5) {
    const gap = Math.round((workout.distanceKm - bests.highestDistanceKm) * 10) / 10;
    return { tone: "chase", text: `${name} just went ${gap} km further than your longest ever. Add ~${Math.max(0.5, Math.round((gap / 3) * 10) / 10)} km a week to catch up.` };
  }
  if (bests.highestDistanceKm != null && workout.distanceKm > 3 && workout.distanceKm < bests.highestDistanceKm - 1) {
    return { tone: "ahead", text: `You've run further than this — your longest is ${bests.highestDistanceKm.toFixed(1)} km.` };
  }
  return null;
}
