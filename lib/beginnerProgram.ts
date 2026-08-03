/**
 * The Beginner-Friendly Mode on-ramp — an 8-stage walk/run interval program (the same shape as
 * a "couch to 5K") plus a short, tiered library of safety/education cards.
 *
 * The plan content (PROGRAM_WEEKS, PROGRAM_TIPS) is static and identical for every beginner —
 * what's personalized is only a user's *position* in it, computed by computeProgramProgress()
 * below. Progress is derived from existing Workout documents (same self-healing pattern as
 * lib/territoryUpkeep.ts and buildTodaysMissionCard in lib/forYou.ts) rather than a separate
 * progress counter that can drift out of sync with what actually happened.
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

export type TipTier = "must-know" | "very-important";
export type ProgramTip = { id: string; title: string; body: string; tier: TipTier };

/**
 * Ordered by actual priority — must-know safety checks first (in the order you'd apply them:
 * before a run, during, after, across the week), then very-important quality-of-life tips.
 * Both the /start hub's grouped display and the feed's rotating tip card (lib/forYou.ts)
 * walk this array in order, so the most important thing a beginner needs to know is always
 * the first thing they ever see.
 */
export const PROGRAM_TIPS: ProgramTip[] = [
  {
    id: "warm-up",
    title: "Always warm up",
    body: "A few minutes of brisk walking before you jog gets blood into your muscles and cuts your injury risk. Never start a run cold.",
    tier: "must-know",
  },
  {
    id: "breathing",
    title: "If you can't talk, slow down",
    body: "You should be able to speak in short sentences while jogging. Out of breath and can't get a word out? Slow to a walk — that's not weakness, that's the plan working.",
    tier: "must-know",
  },
  {
    id: "soreness-vs-pain",
    title: "Soreness vs. pain",
    body: "A dull ache in your muscles a day after running is normal — that's soreness, and it fades. A sharp pain, or anything in a joint, is different: stop and rest it. When in doubt, take the day off.",
    tier: "must-know",
  },
  {
    id: "rest-days",
    title: "Rest days are training too",
    body: "Your body gets stronger during rest, not during the run itself. Skipping rest days doesn't speed up progress — it's the fastest way to an injury that actually sets you back.",
    tier: "must-know",
  },
  {
    id: "shoes",
    title: "Shoes matter more than gear",
    body: "You don't need anything fancy to start, but a pair of proper running shoes (not worn-out sneakers) makes a real difference to comfort and injury risk.",
    tier: "very-important",
  },
  {
    id: "cool-down",
    title: "Cool down after",
    body: "Ease into a walk for the last few minutes instead of stopping dead, then a light stretch. It helps your heart rate come down gradually and helps recovery.",
    tier: "very-important",
  },
  {
    id: "hydration",
    title: "Hydrate before, not just after",
    body: "Drink water earlier in the day rather than chugging it right before you head out. For anything under 45 minutes you usually don't need to carry water at all.",
    tier: "very-important",
  },
  {
    id: "consistency",
    title: "Consistency beats speed",
    body: "Nobody cares how fast your first month of runs are. Showing up 3 times a week, every week, is what turns a beginner into a runner — speed comes later, on its own.",
    tier: "very-important",
  },
];

export function tipsByTier(): { tier: TipTier; label: string; tips: ProgramTip[] }[] {
  return [
    { tier: "must-know", label: "Must know", tips: PROGRAM_TIPS.filter((t) => t.tier === "must-know") },
    { tier: "very-important", label: "Very important", tips: PROGRAM_TIPS.filter((t) => t.tier === "very-important") },
  ];
}

/** One counted session, for the kudos card (lib/forYou.ts) to react to right after it happens. */
export type CompletedSessionEvent = {
  week: number;
  sessionNumber: number; // 1-indexed within that week
  totalSessionsInWeek: number;
  at: Date;
  completedWeek: boolean; // this session was the one that hit the week's target
  completedProgram: boolean; // this session finished the entire program
};

export type ProgramProgress = {
  week: number; // 1-indexed, clamped to [1, PROGRAM_LENGTH_WEEKS]
  totalWeeks: number;
  sessionsThisWeek: number;
  sessionsTargetThisWeek: number;
  isComplete: boolean;
  currentWeekData: ProgramWeek;
  /** The most recent counted session, if any — used to detect "they just finished one." */
  lastCompletedSession: CompletedSessionEvent | null;
};

const DAY_MS = 86400e3;

/**
 * Default minimum gap (in calendar days) required between two counted sessions — i.e. a real
 * rest day between them. This is the safety floor: it's what stops someone from clearing a
 * week's target (and the whole 8-stage ramp) by running three times in one day. It's also
 * directly why compressing this into a fixed "3-4 weeks for everyone" isn't safe — connective
 * tissue (bone/tendon/ligament) adapts much slower than cardio fitness does, and this gap is
 * what paces that adaptation regardless of how motivated someone is. Callers may widen it (see
 * lib/age.ts's minRestDaysForAge) but never narrow it below this default.
 */
export const DEFAULT_MIN_DAYS_BETWEEN_SESSIONS = 2;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Derives where a beginner is in the program by replaying their actual run/walk history since
 * they started — no persisted counter to drift, and re-toggling the mode off/on just resumes
 * from the same replay rather than losing progress.
 *
 * Advancement is performance-gated, not calendar-gated: a stage only advances once its session
 * target is met, so skipping sessions no longer silently pushes someone into a harder week
 * they're not ready for — and someone who's consistent (with real rest days between runs, see
 * minDaysBetweenSessions) naturally clears the whole program faster than a fixed calendar
 * countdown would have let them, without the plan itself ever getting less safe.
 */
export function computeProgramProgress(
  startedAt: Date,
  recentWorkoutDates: Date[],
  now: Date = new Date(),
  minDaysBetweenSessions: number = DEFAULT_MIN_DAYS_BETWEEN_SESSIONS,
): ProgramProgress {
  const sorted = recentWorkoutDates
    .filter((d) => d.getTime() >= startedAt.getTime() && d.getTime() <= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  let week = 1;
  let sessionsThisWeek = 0;
  let lastCountedDay: string | null = null;
  let lastCompletedSession: CompletedSessionEvent | null = null;

  for (const d of sorted) {
    if (week > PROGRAM_LENGTH_WEEKS) break; // already graduated — stop replaying

    if (lastCountedDay !== null) {
      const gapDays = Math.round((d.getTime() - new Date(lastCountedDay).getTime()) / DAY_MS);
      if (gapDays < minDaysBetweenSessions) continue; // too soon after the last counted session — doesn't advance the plan
    }

    sessionsThisWeek++;
    lastCountedDay = dayKey(d);
    const totalSessionsInWeek = PROGRAM_WEEKS[week - 1].sessions.length;
    const completedWeek = sessionsThisWeek >= totalSessionsInWeek;
    lastCompletedSession = {
      week,
      sessionNumber: sessionsThisWeek,
      totalSessionsInWeek,
      at: d,
      completedWeek,
      completedProgram: completedWeek && week === PROGRAM_LENGTH_WEEKS,
    };

    if (completedWeek) {
      week++;
      sessionsThisWeek = 0;
    }
  }

  const isComplete = week > PROGRAM_LENGTH_WEEKS;
  const clampedWeek = Math.min(week, PROGRAM_LENGTH_WEEKS);
  const currentWeekData = PROGRAM_WEEKS[clampedWeek - 1];

  return {
    week: clampedWeek,
    totalWeeks: PROGRAM_LENGTH_WEEKS,
    sessionsThisWeek: isComplete ? currentWeekData.sessions.length : sessionsThisWeek,
    sessionsTargetThisWeek: currentWeekData.sessions.length,
    isComplete,
    currentWeekData,
    lastCompletedSession,
  };
}

// ---------------------------------------------------------------------------
// Motivation — quotes, session kudos, and stage-complete messages
// ---------------------------------------------------------------------------

/**
 * Shown under the "Hey {name}" greeting on /start, one per day (see pickByDay). Kept short —
 * this is a warm accent line, not a wall of text — and specifically about starting out / small
 * consistent steps, not generic "hustle" fitness-influencer language.
 */
export const MOTIVATIONAL_QUOTES: string[] = [
  "Every runner you'll ever admire started with a walk.",
  "You don't have to be fast. You just have to keep showing up.",
  "The only run you'll regret is the one you didn't start.",
  "Slow is a pace, not a failure.",
  "A year from now, you'll wish you had started today. So today counts.",
  "Progress you can't see yet is still progress.",
  "Nobody is judging your pace. Least of all this app.",
  "The hardest part is the shoes going on. You've already done that.",
  "Consistency is quietly more powerful than intensity.",
  "You're not behind. There's no schedule but your own.",
  "Small steps, repeated, are how every runner got here.",
  "Today's session doesn't need to be impressive. It just needs to happen.",
];

/** Deterministic day-based rotation so a page's content is stable across a day's visits but
 * changes daily — same pattern as the feed's tip rotation in lib/forYou.ts. */
export function pickByDay<T>(pool: T[], now: Date = new Date()): T {
  const daysSinceEpoch = Math.floor(now.getTime() / DAY_MS);
  return pool[daysSinceEpoch % pool.length];
}

/** Warm, varied acknowledgement for finishing a single session — not a milestone, just showing up. */
export const SESSION_KUDOS_MESSAGES: string[] = [
  "You showed up and did the work — that's the whole game right now. Proud of you.",
  "Every runner alive started exactly where you are today. Session logged, and you're one step closer.",
  "That's how it's done. Small, consistent efforts like this are exactly what builds a runner.",
  "However that felt, you finished it. That's a real win, not a small one.",
  "You just did something your past self would be proud of. No need to rush — this pace is exactly right.",
  "Nice work. Your body is already adapting, even if you can't feel it yet — trust the process.",
  "That session's in the books. One at a time is all this ever takes.",
];

/** A bigger, more celebratory bump for finishing an entire stage. */
export const WEEK_COMPLETE_MESSAGES: string[] = [
  "You just finished a whole stage of your plan. That's genuinely something to be proud of.",
  "Stage complete! You're not the same runner you were when you started this one.",
  "That's a full stage down — however long it took you, you got there, and that's what matters.",
];

/** Picks a message using the session's own timestamp as the seed, so the same session always
 * shows the same message (stable across re-renders) while different sessions vary. */
export function pickForSession<T>(pool: T[], session: CompletedSessionEvent): T {
  const seed = Math.floor(session.at.getTime() / DAY_MS) + session.week * 7 + session.sessionNumber;
  return pool[((seed % pool.length) + pool.length) % pool.length];
}
