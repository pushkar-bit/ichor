import { Workout } from "@/models/Workout";
import { Battle } from "@/models/Battle";
import { CoachMessage } from "@/models/CoachMessage";
import { ClanMember, Clan } from "@/models/Clan";
import { Notification } from "@/models/Notification";
import { getPersonalBests } from "./personalBests";

/**
 * The "For You" intelligence layer that fronts the feed. Everything here is computed
 * server-side and passed to the client as plain props (see lib/feed.ts note on the RSC
 * data-props pattern) — no async RSC boundaries.
 *
 * It is NOT a fixed set of widgets: every builder emits zero or more candidate cards with a
 * `priority`, and the engine returns them ranked. The highest-priority card wins the hero slot,
 * so the surface changes with the moment — a streak at risk in the evening, a kudos card right
 * after a run, an incoming attack that needs a response.
 */

// ---------------------------------------------------------------------------
// Card union — one variant per surface. `kind` drives the client renderer.
// ---------------------------------------------------------------------------

type CardBase = { id: string; priority: number };

export type ForYouCard = CardBase &
  (
    | { kind: "under_attack"; battleId: string; territoryName: string; opponentName: string; respondBy: string }
    | { kind: "battle_resolved"; battleId: string; territoryName: string; outcome: "won" | "lost" | "split" | "forfeit"; pointsDelta: number }
    | { kind: "attack_opportunity"; territoryId: string; territoryName: string; coveragePct: number }
    | { kind: "duel_soon"; battleId: string; territoryName: string; windowStart: string }
    | {
        kind: "post_run_kudos";
        distanceKm: number;
        paceMinPerKm: number | null;
        headline: string;
        detail: string;
        isPB: boolean;
      }
    | { kind: "streak"; streakDays: number; atRisk: boolean; freezes: number }
    | { kind: "weekly"; distanceKm: number; runs: number; calories: number; bestPaceMinPerKm: number | null; vsLastWeekPct: number | null }
    | { kind: "heatmap"; days: { date: string; level: number }[]; totalDays: number }
    | { kind: "milestone"; label: string; remainingKm: number; targetKm: number }
    | { kind: "comeback"; daysAway: number }
    | { kind: "on_this_day"; yearsAgo: number; distanceKm: number; activityType: string }
    | { kind: "clan_pulse"; clanName: string; ranToday: number; myContributionPct: number | null }
    | { kind: "todays_mission"; text: string; targetKm: number | null }
    | { kind: "coach_tip"; text: string }
    | { kind: "leaderboard_move"; rank: number; category: string }
    | { kind: "rival"; rivalName: string; metric: string; gapText: string; behindBy: number }
    | { kind: "percentile"; percentile: number; metric: "distance"; sampleSize: number }
    | { kind: "best_time"; timeLabel: string; paceGapSeconds: number }
    | { kind: "skip_risk"; dayName: string; missRatePct: number }
    | { kind: "race_predictor"; predictions: { label: string; time: string }[]; basedOnKm: number }
    | { kind: "goal_projection"; targetKm: number; etaDate: string }
  );

type ViewerLike = {
  _id: unknown;
  name?: string;
  streakDays?: number;
  bestStreakDays?: number;
  streakFreezesAvailable?: number;
  totalDistanceKm?: number;
  clanId?: unknown;
};

type WorkoutLean = {
  _id: unknown;
  activityType: string;
  distanceKm: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
  workoutDate: Date;
  durationSeconds?: number;
};

type LeaderboardRow = { userId: string; name: string; value: number; unit: string };

const DAY_MS = 86400e3;
const KUDOS_FRESH_HOURS = 10;
const STREAK_AT_RISK_HOUR = 17; // local evening: nudge before the day is lost
const HEATMAP_DAYS = 84; // ~12 weeks
const MILESTONES_KM = [50, 100, 250, 500, 1000, 2000, 5000];

// Deeper-personalization tuning knobs
const PERCENTILE_MIN_SAMPLE = 5; // need a real crowd before a percentile means anything
const PERCENTILE_MIN_TO_SHOW = 50; // only surface when it's a flattering, motivating stat
const BEST_TIME_MIN_RUNS = 6;
const BEST_TIME_MIN_BUCKET_RUNS = 3;
const BEST_TIME_MIN_GAP_SECONDS = 5;
const SKIP_RISK_LOOKBACK_DAYS = 56; // ~8 weeks of the same weekday
const SKIP_RISK_MIN_OCCURRENCES = 4;
const SKIP_RISK_MIN_MISS_RATE = 0.65;
const RACE_PREDICTOR_MAX_AGE_DAYS = 120;
const RIEGEL_EXPONENT = 1.06; // standard race-time projection exponent
const RACE_DISTANCES = [
  { label: "5K", km: 5 },
  { label: "10K", km: 10 },
  { label: "Half Marathon", km: 21.0975 },
  { label: "Marathon", km: 42.195 },
];
const GOAL_PROJECTION_MIN_WEEKLY_KM = 3; // must be meaningfully active to extrapolate
const GOAL_PROJECTION_MAX_WEEKS_OUT = 52; // cap so it's never a silly decade-out forecast

/** Hour-of-day buckets (UTC — workoutDate carries the run's actual instant either way). */
const TIME_BUCKETS = [
  { label: "early morning", start: 4, end: 8 },
  { label: "morning", start: 8, end: 11 },
  { label: "midday", start: 11, end: 14 },
  { label: "afternoon", start: 14, end: 17 },
  { label: "evening", start: 17, end: 21 },
  { label: "night", start: 21, end: 4 }, // wraps past midnight
];
function bucketForHour(hour: number) {
  return TIME_BUCKETS.find((b) => (b.start < b.end ? hour >= b.start && hour < b.end : hour >= b.start || hour < b.end))!;
}

function dayKey(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}
function id(kind: string, suffix: string | number = ""): string {
  return `${kind}:${suffix}`;
}
/** Rounds pace difference to whole seconds/km for clean coaching copy. */
function paceGapSeconds(a: number, b: number): number {
  return Math.round(Math.abs(a - b) * 60);
}

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export async function buildForYou(
  viewer: ViewerLike,
  opts: { leaderboard?: LeaderboardRow[] | null; now?: Date } = {},
): Promise<ForYouCard[]> {
  const now = opts.now ?? new Date();
  const viewerId = String(viewer._id);

  // One workout read covers heatmap / weekly / kudos / comeback / on-this-day / PBs.
  const since = new Date(now.getTime() - 370 * DAY_MS);
  const [workouts, battles, coach, opportunities, cardsFromClan, percentileCard] = await Promise.all([
    Workout.find({ userId: viewer._id, workoutDate: { $gte: since } })
      .sort({ workoutDate: -1 })
      .select("activityType distanceKm avgPaceMinPerKm caloriesBurned workoutDate durationSeconds")
      .lean() as unknown as Promise<WorkoutLean[]>,
    Battle.find({
      $or: [{ attackerId: viewer._id }, { defenderId: viewer._id }],
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("territoryId", "name")
      .lean(),
    CoachMessage.findOne({ userId: viewer._id, role: "coach" }).sort({ createdAt: -1 }).select("text").lean(),
    Notification.find({
      userId: viewer._id,
      type: "ATTACK_OPPORTUNITY",
      readAt: null,
      createdAt: { $gte: new Date(now.getTime() - 2 * DAY_MS) },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
    buildClanPulse(viewer, now),
    buildPercentileCard(viewerId, now),
  ]);

  const cards: (ForYouCard | null)[] = [];

  cards.push(...buildBattleCards(battles as any[], viewerId, now));
  cards.push(...buildOpportunityCards(opportunities as any[]));
  cards.push(buildKudosCard(workouts, now));
  cards.push(buildStreakCard(viewer, workouts, now));
  cards.push(buildWeeklyCard(workouts, now));
  cards.push(buildHeatmapCard(workouts, now));
  cards.push(buildMilestoneCard(viewer));
  cards.push(buildComebackCard(workouts, now));
  cards.push(buildOnThisDayCard(workouts, now));
  cards.push(buildTodaysMissionCard(viewer, workouts, now));
  cards.push(buildCoachCard(coach as { text?: string } | null));
  cards.push(buildLeaderboardCard(opts.leaderboard ?? null, viewerId));
  cards.push(buildRivalCard(opts.leaderboard ?? null, viewerId));
  cards.push(cardsFromClan);
  cards.push(percentileCard);
  cards.push(buildBestTimeCard(workouts));
  cards.push(buildSkipRiskCard(workouts, now));
  cards.push(buildRacePredictorCard(workouts, now));
  cards.push(buildGoalProjectionCard(viewer, workouts, now));

  return cards.filter((c): c is ForYouCard => c !== null).sort((a, b) => b.priority - a.priority);
}

// ---------------------------------------------------------------------------
// Battle / territory cards
// ---------------------------------------------------------------------------

function buildBattleCards(battles: any[], viewerId: string, now: Date): (ForYouCard | null)[] {
  const out: (ForYouCard | null)[] = [];
  for (const b of battles) {
    const territoryName = b.territoryId?.name ?? "contested land";
    const iAmDefender = String(b.defenderId) === viewerId;
    const iAmAttacker = String(b.attackerId) === viewerId;

    if (b.status === "PENDING_RESPONSE" && iAmDefender && b.respondBy) {
      const hoursLeft = (new Date(b.respondBy).getTime() - now.getTime()) / 3600e3;
      // The closer the deadline, the higher it climbs — an ambient nudge becomes a top priority.
      const urgency = hoursLeft <= 0 ? 0 : Math.max(0, 30 - hoursLeft);
      out.push({
        kind: "under_attack",
        id: id("under_attack", String(b._id)),
        priority: 100 + urgency,
        battleId: String(b._id),
        territoryName,
        opponentName: "A rival", // name stays fogged until resolution
        respondBy: new Date(b.respondBy).toISOString(),
      });
    } else if (b.status === "DUEL_SCHEDULED" && b.duelWindowStart && new Date(b.duelWindowStart) > now) {
      out.push({
        kind: "duel_soon",
        id: id("duel", String(b._id)),
        priority: 82,
        battleId: String(b._id),
        territoryName,
        windowStart: new Date(b.duelWindowStart).toISOString(),
      });
    } else if (b.status === "RESOLVED" && b.resolvedAt && now.getTime() - new Date(b.resolvedAt).getTime() < 2 * DAY_MS) {
      const won = b.winnerId && String(b.winnerId) === viewerId;
      const outcome: "won" | "lost" | "split" | "forfeit" =
        b.resolution === "SPLIT" ? "split" : b.resolution === "DOUBLE_FORFEIT" ? "forfeit" : won ? "won" : "lost";
      out.push({
        kind: "battle_resolved",
        id: id("battle_resolved", String(b._id)),
        priority: won ? 93 : 88,
        battleId: String(b._id),
        territoryName,
        outcome,
        pointsDelta: 0, // filled from the ledger on the client reveal; headline stands alone
      });
    }
  }
  return out;
}

/** Recent unread "you covered X% of someone's land" nudges → one-tap attack prompts. */
function buildOpportunityCards(notes: any[]): (ForYouCard | null)[] {
  const seen = new Set<string>();
  const out: (ForYouCard | null)[] = [];
  for (const n of notes) {
    const territoryId = n.data?.territoryId ? String(n.data.territoryId) : null;
    if (!territoryId || seen.has(territoryId)) continue;
    seen.add(territoryId);
    // The coverage % and land name live in the notification title ("You ran 42% of Canal Road").
    const m = /(\d+)%\s+of\s+(.+)$/.exec(n.title ?? "");
    out.push({
      kind: "attack_opportunity",
      id: id("opportunity", territoryId),
      priority: 72,
      territoryId,
      territoryName: m?.[2] ?? "contested land",
      coveragePct: m ? Number(m[1]) : 40,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Self cards
// ---------------------------------------------------------------------------

function buildKudosCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const runs = workouts.filter((w) => w.activityType === "RUN");
  const latest = runs[0];
  if (!latest) return null;
  const ageHours = (now.getTime() - new Date(latest.workoutDate).getTime()) / 3600e3;
  if (ageHours > KUDOS_FRESH_HOURS) return null;

  const priorRuns = runs.slice(1);
  const pb = getPersonalBests(runs as any);
  let headline = "Nice run logged 💪";
  let detail = `${latest.distanceKm.toFixed(2)} km in the books.`;
  let isPB = false;

  const pace = latest.avgPaceMinPerKm;
  if (pace != null && priorRuns.length > 0) {
    const recent = priorRuns.slice(0, 5).filter((w) => w.avgPaceMinPerKm != null);
    if (recent.length) {
      const avg = recent.reduce((s, w) => s + (w.avgPaceMinPerKm as number), 0) / recent.length;
      const gap = paceGapSeconds(pace, avg);
      if (pace < avg && gap >= 2) {
        headline = "That was quick 🔥";
        detail = `${latest.distanceKm.toFixed(2)} km at ${fmtPace(pace)} — ${gap}s/km faster than your recent average.`;
      } else if (pace > avg && gap >= 5) {
        headline = "Run logged 👏";
        detail = `${latest.distanceKm.toFixed(2)} km at ${fmtPace(pace)} — an easy-effort day, ${gap}s/km off your average.`;
      } else {
        detail = `${latest.distanceKm.toFixed(2)} km at ${fmtPace(pace)} — right on your usual pace.`;
      }
    }
  }

  // PB overrides the headline — the strongest possible affirmation.
  const longest = runs.reduce((m, w) => Math.max(m, w.distanceKm), 0);
  if (latest.distanceKm >= longest && runs.length > 1) {
    headline = "Longest run ever 🏆";
    detail = `${latest.distanceKm.toFixed(2)} km — a new distance record.`;
    isPB = true;
  } else if (pace != null && pb.best5kPaceMinPerKm != null && pace <= pb.best5kPaceMinPerKm && latest.distanceKm >= 4.8 && latest.distanceKm <= 5.3) {
    headline = "New 5K PB 🏆";
    detail = `${fmtPace(pace)} over ${latest.distanceKm.toFixed(2)} km — your fastest 5K yet.`;
    isPB = true;
  }

  return {
    kind: "post_run_kudos",
    id: id("kudos", String(latest._id)),
    priority: isPB ? 96 : 92,
    distanceKm: latest.distanceKm,
    paceMinPerKm: pace,
    headline,
    detail,
    isPB,
  };
}

function buildStreakCard(viewer: ViewerLike, workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const streak = viewer.streakDays ?? 0;
  if (streak < 2) return null;
  const ranToday = workouts.some((w) => dayKey(new Date(w.workoutDate)) === dayKey(now));
  const atRisk = !ranToday && now.getHours() >= STREAK_AT_RISK_HOUR;
  return {
    kind: "streak",
    id: id("streak"),
    priority: atRisk ? 98 : ranToday ? 50 : 70,
    streakDays: streak,
    atRisk,
    freezes: viewer.streakFreezesAvailable ?? 0,
  };
}

function buildWeeklyCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const thisWeek = windowStats(workouts, now, 0, 7);
  if (thisWeek.runs === 0) return null;
  const lastWeek = windowStats(workouts, now, 7, 14);
  const vsLastWeekPct =
    lastWeek.distanceKm > 0 ? Math.round(((thisWeek.distanceKm - lastWeek.distanceKm) / lastWeek.distanceKm) * 100) : null;
  // Monday-morning recaps feel most relevant; nudge priority early in the week.
  const dow = now.getDay();
  return {
    kind: "weekly",
    id: id("weekly"),
    priority: dow === 0 || dow === 1 ? 66 : 52,
    distanceKm: Math.round(thisWeek.distanceKm * 10) / 10,
    runs: thisWeek.runs,
    calories: thisWeek.calories,
    bestPaceMinPerKm: thisWeek.bestPace,
    vsLastWeekPct,
  };
}

function buildHeatmapCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  if (workouts.length === 0) return null;
  const byDay = new Map<string, number>();
  for (const w of workouts) {
    const k = dayKey(new Date(w.workoutDate));
    byDay.set(k, (byDay.get(k) ?? 0) + w.distanceKm);
  }
  const days: { date: string; level: number }[] = [];
  let active = 0;
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const km = byDay.get(dayKey(d)) ?? 0;
    if (km > 0) active++;
    // 0..4 intensity buckets by distance for the calendar shading.
    const level = km === 0 ? 0 : km < 3 ? 1 : km < 6 ? 2 : km < 10 ? 3 : 4;
    days.push({ date: dayKey(d), level });
  }
  return { kind: "heatmap", id: id("heatmap"), priority: 40, days, totalDays: active };
}

function buildMilestoneCard(viewer: ViewerLike): ForYouCard | null {
  const total = viewer.totalDistanceKm ?? 0;
  if (total <= 0) return null;
  const next = MILESTONES_KM.find((m) => m > total);
  if (!next) return null;
  const remaining = Math.round((next - total) * 10) / 10;
  if (remaining > next * 0.15) return null; // only surface when it's within reach
  return { kind: "milestone", id: id("milestone", next), priority: 60, label: `${next} km all-time`, remainingKm: remaining, targetKm: next };
}

function buildComebackCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  if (workouts.length < 2) return null;
  const [latest, prev] = workouts;
  const latestAgeDays = (now.getTime() - new Date(latest.workoutDate).getTime()) / DAY_MS;
  if (latestAgeDays > 2) return null; // only right after they came back
  const gapDays = Math.round((new Date(latest.workoutDate).getTime() - new Date(prev.workoutDate).getTime()) / DAY_MS);
  if (gapDays < 7) return null;
  return { kind: "comeback", id: id("comeback", String(latest._id)), priority: 86, daysAway: gapDays };
}

function buildOnThisDayCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  for (const w of workouts) {
    const days = (now.getTime() - new Date(w.workoutDate).getTime()) / DAY_MS;
    const years = Math.round(days / 365);
    if (years >= 1 && Math.abs(days - years * 365) <= 3) {
      return {
        kind: "on_this_day",
        id: id("on_this_day", String(w._id)),
        priority: 48,
        yearsAgo: years,
        distanceKm: w.distanceKm,
        activityType: w.activityType,
      };
    }
  }
  return null;
}

// "Today's mission" calibration. The target is a SINGLE run the user can realistically do
// today — sized to their own typical run, never the whole weekly deficit (which produced
// nonsense like "run 26 km today"). A base level everyone gets nudged toward keeps brand-new
// or lapsed runners moving without overwhelming them.
const BASE_SESSION_KM = 2; // the smallest run that counts as "you showed up"
const BASE_WEEKLY_KM = 10; // a healthy floor we gently push everyone toward
const MISSION_MAX_KM = 12; // never suggest more than this as a single day's mission
const MISSION_TYPICAL_SAMPLE = 15; // recent runs used to gauge "typical"

/** The user's typical single-run distance (median of recent runs), clamped to a sane,
 * do-able range — the basis for a realistic daily target rather than a weekly total. */
function typicalRunKm(runs: WorkoutLean[]): number {
  const dists = runs
    .slice(0, MISSION_TYPICAL_SAMPLE)
    .map((r) => r.distanceKm)
    .filter((d) => d > 0)
    .sort((a, b) => a - b);
  if (dists.length === 0) return BASE_SESSION_KM;
  const median = dists[Math.floor(dists.length / 2)];
  return Math.min(MISSION_MAX_KM, Math.max(BASE_SESSION_KM, median));
}

function buildTodaysMissionCard(viewer: ViewerLike, workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const ranToday = workouts.some((w) => dayKey(new Date(w.workoutDate)) === dayKey(now));
  if (ranToday) return null;

  const runs = workouts.filter((w) => w.activityType === "RUN");
  const target = Math.round(typicalRunKm(runs) * 2) / 2; // realistic single run, nearest 0.5 km
  const weekly = windowStats(workouts, now, 0, 7).distanceKm;
  const lastWeekly = windowStats(workouts, now, 7, 14).distanceKm;

  // Tone scales with how much they've already done — push the under-active toward the base
  // level, keep the on-track steady, and celebrate (don't nag) the already-ahead.
  let text: string;
  let priority: number;
  if (weekly < BASE_WEEKLY_KM) {
    priority = 62;
    text =
      weekly <= 0
        ? `Your week's a blank slate — a ${target} km run gets you on the board.`
        : `You're at ${Math.round(weekly * 10) / 10} km this week. A ${target} km run moves you toward a solid ${BASE_WEEKLY_KM} km week.`;
  } else if (lastWeekly > 0 && weekly < lastWeekly) {
    priority = 54;
    text = `A ${target} km run today keeps you on pace with last week — right in your range.`;
  } else {
    priority = 46;
    text = `You're already ahead of last week 🔥 An easy ${target} km keeps the momentum going.`;
  }

  return { kind: "todays_mission", id: id("mission"), priority, text, targetKm: target };
}

function buildCoachCard(coach: { text?: string } | null): ForYouCard | null {
  if (!coach?.text) return null;
  const text = coach.text.length > 180 ? coach.text.slice(0, 177) + "…" : coach.text;
  return { kind: "coach_tip", id: id("coach"), priority: 46, text };
}

function buildLeaderboardCard(leaderboard: LeaderboardRow[] | null, viewerId: string): ForYouCard | null {
  if (!leaderboard) return null;
  const idx = leaderboard.findIndex((r) => r.userId === viewerId);
  if (idx < 0 || idx > 9) return null; // only celebrate a top-10 standing
  return { kind: "leaderboard_move", id: id("rank"), priority: idx < 3 ? 74 : 54, rank: idx + 1, category: "calories this week" };
}

function buildRivalCard(leaderboard: LeaderboardRow[] | null, viewerId: string): ForYouCard | null {
  if (!leaderboard || leaderboard.length < 2) return null;
  const idx = leaderboard.findIndex((r) => r.userId === viewerId);
  if (idx <= 0) return null; // #1 has no one to chase
  const rival = leaderboard[idx - 1];
  const me = leaderboard[idx];
  const behind = Math.round((rival.value - me.value) * 10) / 10;
  if (behind <= 0) return null;
  return {
    kind: "rival",
    id: id("rival", rival.userId),
    priority: 56,
    rivalName: rival.name,
    metric: rival.unit === "km" ? "distance" : "points",
    gapText: `${behind} ${rival.unit} behind — one good session closes it.`,
    behindBy: behind,
  };
}

async function buildClanPulse(viewer: ViewerLike, now: Date): Promise<ForYouCard | null> {
  if (!viewer.clanId) return null;
  try {
    const [clan, members] = await Promise.all([
      Clan.findById(viewer.clanId).select("name").lean() as Promise<{ name?: string } | null>,
      ClanMember.find({ clanId: viewer.clanId }).select("userId").lean() as Promise<{ userId: unknown }[]>,
    ]);
    if (!clan || members.length === 0) return null;
    const memberIds = members.map((m) => m.userId);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const todayWorkouts = (await Workout.find({ userId: { $in: memberIds }, workoutDate: { $gte: start } })
      .select("userId")
      .lean()) as { userId: unknown }[];
    const ranToday = new Set(todayWorkouts.map((w) => String(w.userId))).size;
    if (ranToday === 0) return null;
    return {
      kind: "clan_pulse",
      id: id("clan"),
      priority: 50,
      clanName: clan.name ?? "Your clan",
      ranToday,
      myContributionPct: null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deeper personalization: percentile, best time-of-day, skip-risk, race predictor
// ---------------------------------------------------------------------------

/** "Faster than 78% of the club this week" — only surfaced when it's a flattering, motivating
 * stat (>= PERCENTILE_MIN_TO_SHOW); a bottom-quartile percentile would just be discouraging. */
async function buildPercentileCard(viewerId: string, now: Date): Promise<ForYouCard | null> {
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const rows = (await Workout.aggregate([
    { $match: { workoutDate: { $gte: weekStart, $lte: now }, activityType: "RUN" } },
    { $group: { _id: "$userId", distanceKm: { $sum: "$distanceKm" } } },
  ])) as { _id: unknown; distanceKm: number }[];

  if (rows.length < PERCENTILE_MIN_SAMPLE) return null;
  const mine = rows.find((r) => String(r._id) === viewerId);
  if (!mine || mine.distanceKm <= 0) return null;

  const behind = rows.filter((r) => r.distanceKm < mine.distanceKm).length;
  const percentile = Math.round((behind / (rows.length - 1)) * 100);
  if (percentile < PERCENTILE_MIN_TO_SHOW) return null;

  return {
    kind: "percentile",
    id: id("percentile"),
    priority: percentile >= 90 ? 70 : 58,
    percentile,
    metric: "distance",
    sampleSize: rows.length,
  };
}

/** Detects a time-of-day where the runner is meaningfully faster than their own overall
 * average — e.g. "you run 12s/km faster in the morning." Needs enough runs per bucket to be
 * a real signal, not noise from one lucky run. */
function buildBestTimeCard(workouts: WorkoutLean[]): ForYouCard | null {
  const runs = workouts.filter((w) => w.activityType === "RUN" && w.avgPaceMinPerKm != null);
  if (runs.length < BEST_TIME_MIN_RUNS) return null;

  const byBucket = new Map<string, number[]>();
  for (const w of runs) {
    const hour = new Date(w.workoutDate).getUTCHours();
    const label = bucketForHour(hour).label;
    const arr = byBucket.get(label) ?? [];
    arr.push(w.avgPaceMinPerKm as number);
    byBucket.set(label, arr);
  }

  const qualifying = [...byBucket.entries()].filter(([, paces]) => paces.length >= BEST_TIME_MIN_BUCKET_RUNS);
  if (qualifying.length < 2) return null; // need at least two buckets to compare

  const overallAvg = runs.reduce((s, w) => s + (w.avgPaceMinPerKm as number), 0) / runs.length;
  let best: { label: string; avg: number } | null = null;
  for (const [label, paces] of qualifying) {
    const avg = paces.reduce((s, p) => s + p, 0) / paces.length;
    if (!best || avg < best.avg) best = { label, avg };
  }
  if (!best) return null;

  const gap = paceGapSeconds(best.avg, overallAvg);
  if (gap < BEST_TIME_MIN_GAP_SECONDS) return null;

  return { kind: "best_time", id: id("best_time", best.label), priority: 47, timeLabel: best.label, paceGapSeconds: gap };
}

/** "You usually miss Thursdays" — looks at the same weekday over the last ~8 weeks (excluding
 * today) and surfaces a nudge only on that weekday, only if they haven't already run today. */
function buildSkipRiskCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const ranToday = workouts.some((w) => dayKey(new Date(w.workoutDate)) === dayKey(now));
  if (ranToday) return null;

  const todayDow = now.getDay();
  const ranDaysSet = new Set(workouts.map((w) => dayKey(new Date(w.workoutDate))));

  let occurrences = 0;
  let hits = 0;
  for (let i = 1; i <= SKIP_RISK_LOOKBACK_DAYS; i++) {
    const d = new Date(now.getTime() - i * DAY_MS);
    if (d.getDay() !== todayDow) continue;
    occurrences++;
    if (ranDaysSet.has(dayKey(d))) hits++;
  }
  if (occurrences < SKIP_RISK_MIN_OCCURRENCES) return null;

  const missRate = 1 - hits / occurrences;
  if (missRate < SKIP_RISK_MIN_MISS_RATE) return null;

  return {
    kind: "skip_risk",
    id: id("skip_risk", todayDow),
    priority: 84,
    dayName: now.toLocaleDateString("en-US", { weekday: "long" }),
    missRatePct: Math.round(missRate * 100),
  };
}

/** Projects standard race times (5K/10K/Half/Marathon) via the Riegel formula from the
 * runner's fastest qualifying recent effort — the same method race-time calculators use. */
function buildRacePredictorCard(workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const candidates = workouts.filter(
    (w) =>
      w.activityType === "RUN" &&
      w.distanceKm >= 3 &&
      w.avgPaceMinPerKm != null &&
      (now.getTime() - new Date(w.workoutDate).getTime()) / DAY_MS <= RACE_PREDICTOR_MAX_AGE_DAYS,
  );
  if (candidates.length === 0) return null;

  const ref = candidates.reduce((best, w) => (w.avgPaceMinPerKm! < best.avgPaceMinPerKm! ? w : best));
  const refSeconds = ref.avgPaceMinPerKm! * 60 * ref.distanceKm;

  const predictions = RACE_DISTANCES.map((rd) => ({
    label: rd.label,
    time: fmtDuration(refSeconds * Math.pow(rd.km / ref.distanceKm, RIEGEL_EXPONENT)),
  }));

  return {
    kind: "race_predictor",
    id: id("race_predictor", String(ref._id)),
    priority: 44,
    predictions,
    basedOnKm: Math.round(ref.distanceKm * 100) / 100,
  };
}

/** "At this rate you'll hit 1,000 km by Sept 12" — extrapolates the next milestone's ETA from
 * the last 4 weeks' pace of accumulation. Skipped when the milestone card already covers the
 * same target (i.e. it's already close) to avoid two cards saying the same thing. */
function buildGoalProjectionCard(viewer: ViewerLike, workouts: WorkoutLean[], now: Date): ForYouCard | null {
  const total = viewer.totalDistanceKm ?? 0;
  if (total <= 0) return null;
  const next = MILESTONES_KM.find((m) => m > total);
  if (!next) return null;

  const remaining = next - total;
  if (remaining <= next * 0.15) return null; // buildMilestoneCard already handles "almost there"

  const last4Weeks = windowStats(workouts, now, 0, 28);
  const weeklyRate = last4Weeks.distanceKm / 4;
  if (weeklyRate < GOAL_PROJECTION_MIN_WEEKLY_KM) return null;

  const weeksNeeded = remaining / weeklyRate;
  if (weeksNeeded > GOAL_PROJECTION_MAX_WEEKS_OUT) return null;

  const etaDate = new Date(now.getTime() + weeksNeeded * 7 * DAY_MS);
  return { kind: "goal_projection", id: id("goal_projection", next), priority: 42, targetKm: next, etaDate: etaDate.toISOString() };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function windowStats(workouts: WorkoutLean[], now: Date, fromDaysAgo: number, toDaysAgo: number) {
  const from = now.getTime() - toDaysAgo * DAY_MS;
  const to = now.getTime() - fromDaysAgo * DAY_MS;
  let distanceKm = 0, calories = 0, runs = 0, bestPace: number | null = null;
  for (const w of workouts) {
    const t = new Date(w.workoutDate).getTime();
    if (t < from || t >= to) continue;
    distanceKm += w.distanceKm;
    calories += w.caloriesBurned;
    runs++;
    if (w.avgPaceMinPerKm != null && (bestPace === null || w.avgPaceMinPerKm < bestPace)) bestPace = w.avgPaceMinPerKm;
  }
  return { distanceKm, calories, runs, bestPace };
}

function fmtPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function fmtDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
