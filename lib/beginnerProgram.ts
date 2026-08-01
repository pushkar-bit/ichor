/**
 * The Beginner-Friendly Mode on-ramp — an 8-week walk/run interval program (the same shape as
 * a "couch to 5K") plus a short library of safety/education cards.
 *
 * Static config, not a DB collection: progress is derived from existing Workout documents (same
 * self-healing pattern as lib/territoryUpkeep.ts and buildTodaysMissionCard in lib/forYou.ts)
 * rather than a separate progress counter that can drift out of sync with what actually happened.
 */

export const PROGRAM_LENGTH_WEEKS = 8;

export type ProgramSession = { label: string; detail: string };
export type ProgramWeek = { week: number; title: string; sessions: ProgramSession[] };

export const PROGRAM_WEEKS: ProgramWeek[] = [
  {
    week: 1,
    title: "Getting moving",
    sessions: [
      { label: "Session 1", detail: "5 min brisk walk to warm up, then 8× (1 min easy jog / 2 min walk), 5 min walk to finish." },
      { label: "Session 2", detail: "5 min brisk walk to warm up, then 8× (1 min easy jog / 2 min walk), 5 min walk to finish." },
      { label: "Session 3", detail: "5 min brisk walk to warm up, then 8× (1 min easy jog / 2 min walk), 5 min walk to finish." },
    ],
  },
  {
    week: 2,
    title: "Building rhythm",
    sessions: [
      { label: "Session 1", detail: "5 min walk, then 6× (1.5 min jog / 2 min walk), 5 min walk to finish." },
      { label: "Session 2", detail: "5 min walk, then 6× (1.5 min jog / 2 min walk), 5 min walk to finish." },
      { label: "Session 3", detail: "5 min walk, then 6× (1.5 min jog / 2 min walk), 5 min walk to finish." },
    ],
  },
  {
    week: 3,
    title: "Longer stretches",
    sessions: [
      { label: "Session 1", detail: "5 min walk, then 2× (3 min jog / 3 min walk, 5 min jog / 3 min walk), 5 min walk to finish." },
      { label: "Session 2", detail: "5 min walk, then 2× (3 min jog / 3 min walk, 5 min jog / 3 min walk), 5 min walk to finish." },
      { label: "Session 3", detail: "5 min walk, then 2× (3 min jog / 3 min walk, 5 min jog / 3 min walk), 5 min walk to finish." },
    ],
  },
  {
    week: 4,
    title: "Finding your stride",
    sessions: [
      { label: "Session 1", detail: "5 min walk, then jog 3 / walk 1.5 / jog 5 / walk 2.5 / jog 3 / walk 1.5 / jog 5, 5 min walk to finish." },
      { label: "Session 2", detail: "5 min walk, then jog 3 / walk 1.5 / jog 5 / walk 2.5 / jog 3 / walk 1.5 / jog 5, 5 min walk to finish." },
      { label: "Session 3", detail: "5 min walk, then jog 3 / walk 1.5 / jog 5 / walk 2.5 / jog 3 / walk 1.5 / jog 5, 5 min walk to finish." },
    ],
  },
  {
    week: 5,
    title: "Stretching the jog",
    sessions: [
      { label: "Session 1", detail: "5 min jog, 3 min walk, 5 min jog." },
      { label: "Session 2", detail: "8 min jog, 5 min walk, 8 min jog." },
      { label: "Session 3", detail: "20 minutes of continuous jogging — your longest yet." },
    ],
  },
  {
    week: 6,
    title: "Closing the gaps",
    sessions: [
      { label: "Session 1", detail: "5 min jog, 3 min walk, 8 min jog, 3 min walk, 5 min jog." },
      { label: "Session 2", detail: "10 min jog, 3 min walk, 10 min jog." },
      { label: "Session 3", detail: "25 minutes of continuous jogging." },
    ],
  },
  {
    week: 7,
    title: "Making it routine",
    sessions: [
      { label: "Session 1", detail: "25 minutes of continuous jogging, easy effort." },
      { label: "Session 2", detail: "25 minutes of continuous jogging, easy effort." },
      { label: "Session 3", detail: "25 minutes of continuous jogging, easy effort." },
    ],
  },
  {
    week: 8,
    title: "Graduation week",
    sessions: [
      { label: "Session 1", detail: "28 minutes of continuous jogging." },
      { label: "Session 2", detail: "28 minutes of continuous jogging." },
      { label: "Session 3", detail: "30 minutes of continuous jogging — the finish line. You did it." },
    ],
  },
];

export type ProgramTip = { id: string; title: string; body: string };

export const PROGRAM_TIPS: ProgramTip[] = [
  {
    id: "soreness-vs-pain",
    title: "Soreness vs. pain",
    body: "A dull ache in your muscles a day after running is normal — that's soreness, and it fades. A sharp pain, or anything in a joint, is different: stop and rest it. When in doubt, take the day off.",
  },
  {
    id: "warm-up",
    title: "Always warm up",
    body: "A few minutes of brisk walking before you jog gets blood into your muscles and cuts your injury risk. Never start a run cold.",
  },
  {
    id: "cool-down",
    title: "Cool down after",
    body: "Ease into a walk for the last few minutes instead of stopping dead, then a light stretch. It helps your heart rate come down gradually and helps recovery.",
  },
  {
    id: "rest-days",
    title: "Rest days are training too",
    body: "Your body gets stronger during rest, not during the run itself. Skipping rest days doesn't speed up progress — it's the fastest way to an injury that actually sets you back.",
  },
  {
    id: "shoes",
    title: "Shoes matter more than gear",
    body: "You don't need anything fancy to start, but a pair of proper running shoes (not worn-out sneakers) makes a real difference to comfort and injury risk.",
  },
  {
    id: "hydration",
    title: "Hydrate before, not just after",
    body: "Drink water earlier in the day rather than chugging it right before you head out. For anything under 45 minutes you usually don't need to carry water at all.",
  },
  {
    id: "breathing",
    title: "If you can't talk, slow down",
    body: "You should be able to speak in short sentences while jogging. Out of breath and can't get a word out? Slow to a walk — that's not weakness, that's the plan working.",
  },
  {
    id: "consistency",
    title: "Consistency beats speed",
    body: "Nobody cares how fast your first month of runs are. Showing up 3 times a week, every week, is what turns a beginner into a runner — speed comes later, on its own.",
  },
];

export type ProgramProgress = {
  week: number; // 1-indexed, clamped to [1, PROGRAM_LENGTH_WEEKS]
  totalWeeks: number;
  sessionsThisWeek: number;
  sessionsTargetThisWeek: number;
  isComplete: boolean;
  currentWeekData: ProgramWeek;
};

const DAY_MS = 86400e3;
const WEEK_MS = 7 * DAY_MS;

/**
 * Derives where a beginner is in the program from when they started and how many run/walk
 * workouts they've logged since the current week began — no persisted counter to drift.
 */
export function computeProgramProgress(
  startedAt: Date,
  recentWorkoutDates: Date[],
  now: Date = new Date(),
): ProgramProgress {
  const elapsedWeeks = Math.floor((now.getTime() - startedAt.getTime()) / WEEK_MS);
  const week = Math.min(PROGRAM_LENGTH_WEEKS, Math.max(1, elapsedWeeks + 1));
  const isComplete = elapsedWeeks >= PROGRAM_LENGTH_WEEKS;
  const currentWeekData = PROGRAM_WEEKS[week - 1];

  const weekStart = new Date(startedAt.getTime() + (week - 1) * WEEK_MS);
  const sessionsThisWeek = recentWorkoutDates.filter((d) => d >= weekStart && d.getTime() <= now.getTime()).length;

  return {
    week,
    totalWeeks: PROGRAM_LENGTH_WEEKS,
    sessionsThisWeek: Math.min(sessionsThisWeek, currentWeekData.sessions.length),
    sessionsTargetThisWeek: currentWeekData.sessions.length,
    isComplete,
    currentWeekData,
  };
}
