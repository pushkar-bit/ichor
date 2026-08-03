/**
 * The Beginner-Friendly Mode on-ramp: an 8-stage walk/run plan whose single stated goal is the
 * runner's first 5K, plus a short, tiered library of safety/education cards.
 *
 * Structure is deliberately time-based early and distance-based late. The early stages are about
 * time on feet — a beginner can't pace a distance target yet, and chasing one is how people hurt
 * themselves in week one. The closing stages switch to kilometres because the goal *is* a
 * distance: a common failure of "30 minutes continuous" plans is that they're sold as couch-to-5K
 * while a genuine beginner at 7-8 min/km only covers ~4 km in that half hour, so they graduate
 * having never actually run 5K.
 *
 * The plan content (PROGRAM_WEEKS, PROGRAM_TIPS) is static and identical for every beginner —
 * what's personalized is only a user's *position* in it, computed by computeProgramProgress()
 * below. Progress is derived from existing Workout documents (same self-healing pattern as
 * lib/territoryUpkeep.ts and buildTodaysMissionCard in lib/forYou.ts) rather than a separate
 * progress counter that can drift out of sync with what actually happened.
 */

export const PROGRAM_LENGTH_WEEKS = 8;

/** The finish line the whole plan is pointed at. */
export const PROGRAM_GOAL_KM = 5;
export const PROGRAM_GOAL_LABEL = "Your first 5K";

/**
 * What a logged activity has to actually achieve to tick this session off. Early stages are
 * gated on duration (a beginner's watch records the whole walk/run session, so time on feet is
 * the honest measure of an interval workout); the closing stages are gated on distance, because
 * by then the session *is* a distance.
 *
 * Only one field is set per session in practice, but both are checked with OR semantics — so a
 * runner who covers a big distance quickly still clears a duration-based session, and vice versa.
 */
export type SessionRequirement = { minDistanceKm?: number; minDurationMin?: number };

/** One instruction in a session. `time` is the duration or distance for that single step. */
export type SessionStep = { text: string; time?: string };

export type ProgramSession = {
  label: string;
  /** One-line version, for compact surfaces like the feed card. */
  summary: string;
  /** The session as an ordered checklist — one action per step, rests included as their own
   * steps. The Strava start/end bookends are added by the UI (see SESSION_START_STEP /
   * SESSION_END_STEP) rather than repeated in every session's data. */
  steps: SessionStep[];
  requires: SessionRequirement;
  /**
   * Set on the final 5K only. Everything else is deliberately lenient (see LENIENT_FACTOR) —
   * but the app tells this runner "you ran your first 5K" at the end, and that claim has to be
   * true, so the last session allows only GPS-drift slack rather than a 15% discount.
   */
  strict?: boolean;
};
export type ProgramWeek = { week: number; title: string; sessions: ProgramSession[] };

/**
 * Sessions count at 85% of their stated target. GPS under-reads, treadmills mis-measure, and a
 * beginner who set out to do 3 km and recorded 2.6 km did the session — rejecting that would
 * punish real effort over a rounding error and is exactly the kind of thing that makes people
 * quit. The goal is to keep beginners moving, not to police them.
 */
export const LENIENT_FACTOR = 0.85;

/** Slack allowed on a `strict` session — enough for GPS drift, not enough to skip a kilometre. */
export const GPS_TOLERANCE_FACTOR = 0.98;

/**
 * Every session is ONE Strava activity, start to finish — warm-up and cool-down included.
 * Stated explicitly at both ends because the alternative (a runner starting and stopping Strava
 * around each jog interval) would record eight tiny activities for one session, none of which
 * would meet the session's target, and the plan would never advance.
 */
export const SESSION_START_STEP: SessionStep = {
  text: "Start ONE run in Strava and leave it recording for everything below — warm-up and cool-down included",
};
export const SESSION_END_STEP: SessionStep = {
  text: "End and save the Strava workout. It syncs here on its own and ticks this session off — nothing else to do",
};

export const PROGRAM_WEEKS: ProgramWeek[] = [
  {
    week: 1,
    title: "Getting moving",
    sessions: [
      {
        label: "Session 1",
        summary: "8 rounds of 1 min jog / 2 min walk, plus a warm-up and cool-down.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog at an easy, conversational pace", time: "1 min" },
          { text: "Walk until your breath comes back", time: "2 min" },
          { text: "Keep alternating that jog and walk until you've done 8 rounds in total", time: "24 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 34 },
      },
      {
        label: "Session 2",
        summary: "8 rounds of 1 min jog / 2 min walk, plus a warm-up and cool-down.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog at an easy, conversational pace", time: "1 min" },
          { text: "Walk until your breath comes back", time: "2 min" },
          { text: "Keep alternating that jog and walk until you've done 8 rounds in total", time: "24 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 34 },
      },
      {
        label: "Session 3",
        summary: "8 rounds of 1 min jog / 2 min walk, plus a warm-up and cool-down.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog at an easy, conversational pace", time: "1 min" },
          { text: "Walk until your breath comes back", time: "2 min" },
          { text: "Keep alternating that jog and walk until you've done 8 rounds in total", time: "24 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 34 },
      },
    ],
  },
  {
    week: 2,
    title: "Building rhythm",
    sessions: [
      {
        label: "Session 1",
        summary: "6 rounds of 1½ min jog / 2 min walk.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog at an easy pace", time: "1½ min" },
          { text: "Walk to recover", time: "2 min" },
          { text: "Keep alternating until you've done 6 rounds in total", time: "21 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 31 },
      },
      {
        label: "Session 2",
        summary: "6 rounds of 1½ min jog / 2 min walk.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog at an easy pace", time: "1½ min" },
          { text: "Walk to recover", time: "2 min" },
          { text: "Keep alternating until you've done 6 rounds in total", time: "21 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 31 },
      },
      {
        label: "Session 3",
        summary: "6 rounds of 1½ min jog / 2 min walk.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog at an easy pace", time: "1½ min" },
          { text: "Walk to recover", time: "2 min" },
          { text: "Keep alternating until you've done 6 rounds in total", time: "21 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 31 },
      },
    ],
  },
  {
    week: 3,
    title: "Longer stretches",
    sessions: [
      {
        label: "Session 1",
        summary: "Longer jog blocks — 3 min and 5 min, twice through.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "3 min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "3 min" },
          { text: "Go through that jog/walk/jog/walk block once more — 2 rounds in total", time: "28 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 38 },
      },
      {
        label: "Session 2",
        summary: "Longer jog blocks — 3 min and 5 min, twice through.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "3 min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "3 min" },
          { text: "Go through that jog/walk/jog/walk block once more — 2 rounds in total", time: "28 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 38 },
      },
      {
        label: "Session 3",
        summary: "Longer jog blocks — 3 min and 5 min, twice through.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "3 min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "3 min" },
          { text: "Go through that jog/walk/jog/walk block once more — 2 rounds in total", time: "28 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 38 },
      },
    ],
  },
  {
    week: 4,
    title: "Finding your stride",
    sessions: [
      {
        label: "Session 1",
        summary: "Three jog blocks building to 5 min, with short walks between.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "1½ min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "2½ min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "1½ min" },
          { text: "Jog — the last one", time: "5 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 32 },
      },
      {
        label: "Session 2",
        summary: "Three jog blocks building to 5 min, with short walks between.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "1½ min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "2½ min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "1½ min" },
          { text: "Jog — the last one", time: "5 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 32 },
      },
      {
        label: "Session 3",
        summary: "Three jog blocks building to 5 min, with short walks between.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "1½ min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "2½ min" },
          { text: "Jog", time: "3 min" },
          { text: "Walk", time: "1½ min" },
          { text: "Jog — the last one", time: "5 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 32 },
      },
    ],
  },
  {
    week: 5,
    title: "Your first continuous run",
    sessions: [
      {
        label: "Session 1",
        summary: "Two 5-minute jogs with a walk in between.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "5 min" },
          { text: "Walk", time: "3 min" },
          { text: "Jog", time: "5 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 23 },
      },
      {
        label: "Session 2",
        summary: "Two 8-minute jogs with a walk in between.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "8 min" },
          { text: "Walk", time: "5 min" },
          { text: "Jog", time: "8 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 31 },
      },
      {
        label: "Session 3",
        summary: "Your first jog with no walk breaks — 20 minutes.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog with no walk breaks. Go slow enough that you could still hold a conversation — that's roughly 2–2.5 km", time: "20 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 30 },
      },
    ],
  },
  {
    week: 6,
    title: "Your first 3K",
    sessions: [
      {
        label: "Session 1",
        summary: "Two 10-minute jogs with a walk in between.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog", time: "10 min" },
          { text: "Walk", time: "3 min" },
          { text: "Jog", time: "10 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 33 },
      },
      {
        label: "Session 2",
        summary: "25 minutes of continuous jogging — around 3 km.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Jog without stopping — around 3 km for most people at an easy pace", time: "25 min" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDurationMin: 35 },
      },
      {
        label: "Session 3",
        summary: "3 km, however long it takes.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run 3 km. The clock genuinely doesn't matter here — only the distance", time: "3 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 3 },
      },
    ],
  },
  {
    week: 7,
    title: "Past the 4K mark",
    sessions: [
      {
        label: "Session 1",
        summary: "3 km at an easy, comfortable pace.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run at an easy, comfortable pace", time: "3 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 3 },
      },
      {
        label: "Session 2",
        summary: "3.5 km — walk breaks are fine.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run 3.5 km. Need a short walk break to get there? Take it — finishing the distance is the point", time: "3.5 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 3.5 },
      },
      {
        label: "Session 3",
        summary: "4 km — only 1 km short of the goal.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run 4 km. Only 1 km short of the goal now", time: "4 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 4 },
      },
    ],
  },
  {
    week: 8,
    title: "Your first 5K",
    sessions: [
      {
        label: "Session 1",
        summary: "4 km, easy effort.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run 4 km at an easy effort. Nothing to prove today", time: "4 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 4 },
      },
      {
        label: "Session 2",
        summary: "4.5 km — the last step before the real thing.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run 4.5 km, then rest well before the next one", time: "4.5 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 4.5 },
      },
      {
        label: "Session 3",
        summary: "5 km. This is the one.",
        steps: [
          { text: "Brisk walk to warm up", time: "5 min" },
          { text: "Run 5 km. Start slower than feels right, walk if you need to, and finish it — this is your first 5K", time: "5 km" },
          { text: "Easy walk to cool down", time: "5 min" },
        ],
        requires: { minDistanceKm: 5 },
        strict: true,
      },
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
  /** Sessions counted across the whole program so far, and the program's total. The progress
   * bar reads from these — using stage number over total stages instead would show a filled
   * sliver before the user has actually done anything. */
  completedSessionsTotal: number;
  totalSessionsInProgram: number;
  /** Earliest moment a new session will count toward the plan, given the rest-day floor. Null
   * when nothing has been logged yet (any session counts immediately). Surfaced in the UI so a
   * runner is never silently told "0 of 3" after a run that didn't count — see restDayNotice. */
  nextSessionCountsFrom: Date | null;
  /** The most recent activity that was rested-clear but fell short of the session's target, if
   * that's still the latest thing they did. Surfaced so a short run is acknowledged rather than
   * silently dropped — the same "don't discard without saying so" rule as the rest-day notice. */
  lastShortfall: SessionShortfall | null;
};

/** An activity that counted for nothing because it didn't reach the session's target. */
export type SessionShortfall = {
  at: Date;
  distanceKm: number;
  durationSeconds: number;
  sessionLabel: string;
  requires: SessionRequirement;
};

/** Total sessions across every stage — the denominator for overall progress. */
export const TOTAL_PROGRAM_SESSIONS = PROGRAM_WEEKS.reduce((sum, w) => sum + w.sessions.length, 0);

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

/** One logged Strava/manual activity, as the replay needs to see it. */
export type ProgramWorkout = { date: Date; distanceKm: number; durationSeconds: number };

/** Effective threshold for a requirement field, after leniency. */
export function effectiveTarget(value: number, strict?: boolean): number {
  return value * (strict ? GPS_TOLERANCE_FACTOR : LENIENT_FACTOR);
}

/** Does this activity satisfy the session's target? OR semantics across the two fields. */
export function meetsRequirement(w: ProgramWorkout, session: ProgramSession): boolean {
  const { minDistanceKm, minDurationMin } = session.requires;
  if (minDistanceKm != null && w.distanceKm >= effectiveTarget(minDistanceKm, session.strict)) return true;
  if (minDurationMin != null && w.durationSeconds / 60 >= effectiveTarget(minDurationMin, session.strict)) return true;
  return false;
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
 *
 * A session also has to actually be *done*: the activity must reach the session's own target
 * (see meetsRequirement). Without that check this replay counted attendance rather than effort,
 * so a 300 m stroll ticked off "5 km" and someone could be told they'd run their first 5K
 * having never run one.
 */
export function computeProgramProgress(
  startedAt: Date,
  recentWorkouts: ProgramWorkout[],
  now: Date = new Date(),
  minDaysBetweenSessions: number = DEFAULT_MIN_DAYS_BETWEEN_SESSIONS,
): ProgramProgress {
  const sorted = recentWorkouts
    .filter((w) => w.date.getTime() >= startedAt.getTime() && w.date.getTime() <= now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let week = 1;
  let sessionsThisWeek = 0;
  let completedSessionsTotal = 0;
  let lastCountedDay: string | null = null;
  let lastCompletedSession: CompletedSessionEvent | null = null;
  let lastShortfall: SessionShortfall | null = null;

  for (const w of sorted) {
    if (week > PROGRAM_LENGTH_WEEKS) break; // already graduated — stop replaying
    const d = w.date;

    if (lastCountedDay !== null) {
      // Compared as whole calendar days (both floored to midnight UTC), not raw elapsed ms.
      // Rounding the ms difference used to let a run late on day 1 pass (1.96d rounds to 2),
      // which contradicted nextSessionCountsFrom below — and that mismatch is visible now that
      // the UI shows a live countdown to exactly that timestamp.
      const gapDays = Math.floor((new Date(dayKey(d)).getTime() - new Date(lastCountedDay).getTime()) / DAY_MS);
      if (gapDays < minDaysBetweenSessions) continue; // too soon after the last counted session — doesn't advance the plan
    }

    const session = PROGRAM_WEEKS[week - 1].sessions[sessionsThisWeek];
    if (!meetsRequirement(w, session)) {
      // Fell short of this session's target. Deliberately does NOT touch lastCountedDay: a run
      // that earned no progress shouldn't also cost them two days of waiting.
      lastShortfall = {
        at: d,
        distanceKm: w.distanceKm,
        durationSeconds: w.durationSeconds,
        sessionLabel: session.label,
        requires: session.requires,
      };
      continue;
    }

    sessionsThisWeek++;
    completedSessionsTotal++;
    lastCountedDay = dayKey(d);
    lastShortfall = null; // superseded by a session that actually landed
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

  // The rest-day floor is measured from the last counted session's calendar day, matching the
  // gate in the replay loop above.
  const nextSessionCountsFrom = lastCountedDay
    ? new Date(new Date(lastCountedDay).getTime() + minDaysBetweenSessions * DAY_MS)
    : null;

  return {
    week: clampedWeek,
    totalWeeks: PROGRAM_LENGTH_WEEKS,
    sessionsThisWeek: isComplete ? currentWeekData.sessions.length : sessionsThisWeek,
    sessionsTargetThisWeek: currentWeekData.sessions.length,
    isComplete,
    currentWeekData,
    lastCompletedSession,
    lastShortfall,
    completedSessionsTotal,
    totalSessionsInProgram: TOTAL_PROGRAM_SESSIONS,
    nextSessionCountsFrom,
  };
}

/**
 * Plain-language status for the rest-day floor, resolved server-side so the label never depends
 * on the viewer's clock. Returns null when a session logged right now would count — i.e. the
 * banner only ever appears when there's something a runner would otherwise be confused by
 * (a run today that quietly wouldn't advance the plan).
 */
/** Short "what this session asks for" label, e.g. "3 km" or "24 min". */
export function targetLabel(session: ProgramSession): string {
  const { minDistanceKm, minDurationMin } = session.requires;
  if (minDistanceKm != null) return `${minDistanceKm} km`;
  if (minDurationMin != null) return `${minDurationMin} min`;
  return "";
}

/**
 * Explains a run that didn't tick a session off. Only returned when the shortfall is the most
 * recent thing that happened, so it reads as feedback on the run they just did rather than as a
 * standing complaint. Deliberately warm — the run still happened and still did them good.
 */
export function shortfallNotice(
  progress: ProgramProgress,
  now: Date = new Date(),
  maxAgeHours = 36,
): { title: string; body: string } | null {
  const s = progress.lastShortfall;
  if (!s || progress.isComplete) return null;
  if ((now.getTime() - s.at.getTime()) / 3600e3 > maxAgeHours) return null;

  const did =
    s.requires.minDistanceKm != null
      ? `${s.distanceKm.toFixed(1)} km`
      : `${Math.round(s.durationSeconds / 60)} min`;
  const asked =
    s.requires.minDistanceKm != null ? `${s.requires.minDistanceKm} km` : `${s.requires.minDurationMin} min`;

  return {
    title: `That one didn't quite reach ${s.sessionLabel.toLowerCase()}`,
    body:
      `You logged ${did} and this session asks for about ${asked}, so it hasn't ticked off yet — but it absolutely ` +
      `still did you good, and it hasn't used up a rest day either. Go again whenever you're ready.`,
  };
}

export function restDayNotice(
  progress: ProgramProgress,
  now: Date = new Date(),
): { title: string; body: string } | null {
  const from = progress.nextSessionCountsFrom;
  if (progress.isComplete || !from || now.getTime() >= from.getTime()) return null;

  const daysLeft = Math.max(1, Math.ceil((from.getTime() - now.getTime()) / DAY_MS));
  const when = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  return {
    title: `Rest day — your next session counts ${when}`,
    body:
      "You've already done a session recently, and the gap between them is where your body actually gets stronger. " +
      "You're welcome to move today if you want to — it just won't tick off the next session on your plan.",
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
  "You just finished a whole stage of your plan. That's genuinely something to be proud of — and it's one stage closer to your 5K.",
  "Stage complete! You're not the same runner you were when you started this one. 5K is getting closer.",
  "That's a full stage down — however long it took you, you got there, and that's what matters.",
];

/** Picks a message using the session's own timestamp as the seed, so the same session always
 * shows the same message (stable across re-renders) while different sessions vary. */
export function pickForSession<T>(pool: T[], session: CompletedSessionEvent): T {
  const seed = Math.floor(session.at.getTime() / DAY_MS) + session.week * 7 + session.sessionNumber;
  return pool[((seed % pool.length) + pool.length) % pool.length];
}
