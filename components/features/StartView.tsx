"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, CheckCircle2, PartyPopper, Loader2, Heart, Circle, Moon,
  CalendarCheck, Unlock, Leaf, ChevronDown, ArrowRight, Target, Footprints,
} from "lucide-react";
import { Countdown } from "./Countdown";
import {
  tipsByTier, PROGRAM_WEEKS, PROGRAM_GOAL_KM, PROGRAM_GOAL_LABEL, targetLabel,
  SESSION_START_STEP, SESSION_END_STEP, type ProgramProgress,
} from "@/lib/beginnerProgram";

/**
 * One deliberate type scale for the whole page, so importance is legible at a glance instead of
 * every line arriving at the same weight. Mirrors the For You rail's Lead treatment (tinted icon
 * chip + tracked eyebrow + large title over a soft gradient wash), which is the visual language
 * the rest of the app already uses to say "this one matters".
 */
const EYEBROW = "text-[11px] font-bold uppercase tracking-[0.15em]";
const SECTION_HEADING = `${EYEBROW} text-white/35`;

/** Per-accent tokens, matching accentStyles() in ForYouRail. */
const ACCENTS = {
  momentum: { text: "text-momentum", chip: "bg-momentum/15", glow: "from-momentum/15", border: "border-momentum/40" },
  afterrun: { text: "text-afterrun", chip: "bg-afterrun/15", glow: "from-afterrun/15", border: "border-afterrun/40" },
  lime: { text: "text-lime", chip: "bg-lime/15", glow: "from-lime/15", border: "border-lime/40" },
} as const;

/** The page's attention-grabber: a washed, bordered card with a large icon chip. Reserved for
 * things a runner would be actively harmed by missing — currently the rest-day gate (their runs
 * won't count) and a run that fell short of its target. */
function HeroCard({
  accent, icon, eyebrow, title, children,
}: {
  accent: keyof typeof ACCENTS;
  icon: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${a.border} bg-midnight-raised`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${a.glow} via-transparent to-transparent pointer-events-none`} />
      <div className="relative flex items-start gap-4 p-5">
        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${a.chip} ${a.text}`}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`${EYEBROW} ${a.text}`}>{eyebrow}</div>
          <div className="font-bold text-xl leading-tight mt-1">{title}</div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** The "how this works" explainer, as scannable points rather than a paragraph. */
const HOW_IT_WORKS = [
  { icon: CalendarCheck, text: "Each stage is a handful of short sessions. Do them whenever suits you." },
  { icon: Moon, text: "Leave a rest day between sessions — that gap is when your body actually gets stronger." },
  { icon: Unlock, text: "Finish a stage's sessions and the next one unlocks on its own." },
  { icon: Leaf, text: "No countdown, no comparisons. Whatever pace gets you through is the right pace." },
];

async function setBeginnerMode(on: boolean) {
  const res = await fetch("/api/users/beginner-mode", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beginnerMode: on }),
  });
  return res.ok;
}

type RestNotice = { title: string; body: string } | null;

export function StartView(
  props:
    | { optedIn: false; name: string; quote: string }
    | {
        optedIn: true;
        name: string;
        progress: ProgramProgress;
        quote: string;
        restNotice?: RestNotice;
        /** ISO instant the rest-day gate lifts — drives the live counter. */
        restCountsFromISO?: string | null;
        shortNotice?: RestNotice;
        longestRunKm?: number;
      },
) {
  const [loading, setLoading] = useState(false);
  const [showJourney, setShowJourney] = useState(false);

  async function handleToggle(on: boolean) {
    setLoading(true);
    const ok = await setBeginnerMode(on);
    if (ok) {
      // Full reload so the (app) layout's server-side data-mode + nav re-resolve from Mongo.
      window.location.href = on ? "/start" : "/feed";
    } else {
      setLoading(false);
    }
  }

  if (!props.optedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-momentum/15 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 text-momentum" />
        </div>
        <h1 className="font-display italic font-bold text-2xl">Want to run your first 5K?</h1>
        <p className="text-sm text-white/60">
          Beginner-Friendly Mode is a guided 8-stage plan that takes you from your very first one-minute jog to
          running a full 5K. It moves at your pace — stages unlock when you finish them, not on a fixed calendar —
          and comes with safety tips written for a first-timer and a warmer, calmer version of the whole app. No
          leaderboard pressure, and no one can raid your ground while you're building your base.
        </p>
        <button
          onClick={() => handleToggle(true)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-momentum text-midnight font-bold py-3.5 rounded-full disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Turn on Beginner-Friendly Mode</>}
        </button>
      </div>
    );
  }

  const { name, progress, quote } = props;
  const restNotice = props.restNotice ?? null;
  const restCountsFromISO = props.restCountsFromISO ?? null;
  const shortNotice = props.shortNotice ?? null;
  const longestRunKm = props.longestRunKm ?? 0;
  const goalPct = Math.min(100, Math.round((longestRunKm / PROGRAM_GOAL_KM) * 100));
  const {
    week, totalWeeks, sessionsThisWeek, sessionsTargetThisWeek, isComplete, currentWeekData,
    completedSessionsTotal, totalSessionsInProgram,
  } = progress;
  // Sessions actually done over the whole program — not stage number, which would show a
  // filled sliver before the runner has done anything at all.
  const pct = Math.round((completedSessionsTotal / totalSessionsInProgram) * 100);
  const nextSessionIndex = sessionsThisWeek; // 0-indexed: the first not-yet-done session

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="font-display italic font-bold text-2xl mb-1">Hey {name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-momentum italic mb-2">&ldquo;{quote}&rdquo;</p>
        <p className="text-sm text-white/60">
          {/* Not PROGRAM_GOAL_LABEL.toLowerCase() — that would render "5k", and the K in 5K is
              a unit, not a word. */}
          Your goal: <span className="text-white font-semibold">your first {PROGRAM_GOAL_KM}K</span>. Here&apos;s the plan
          that gets you there — one stage at a time, no pressure.
        </p>
      </div>

      {/* Promoted to the loudest thing on the page: while this is up, runs genuinely do not
          count toward the plan, and that was previously buried in the same small grey text as
          everything else. The live counter answers the only question it raises — "how long?" */}
      {restNotice && (
        <HeroCard
          accent="momentum"
          icon={<Moon className="w-6 h-6" />}
          eyebrow="Rest day"
          title="Your next session counts in"
        >
          <div className="text-3xl font-bold text-momentum tabular-nums mt-1 leading-none">
            <Countdown to={restCountsFromISO} prefix="" suffix="" precise expiredText="now — you're good to go" />
          </div>
          <p className="text-sm text-white/60 mt-3 leading-relaxed">{restNotice.body}</p>
        </HeroCard>
      )}

      {/* A run that happened but didn't reach the target. Distinct accent from the rest-day card
          so the two never read as the same message at a glance. */}
      {shortNotice && (
        <HeroCard
          accent="afterrun"
          icon={<Footprints className="w-6 h-6" />}
          eyebrow="Almost"
          title={shortNotice.title}
        >
          <p className="text-sm text-white/60 mt-2 leading-relaxed">{shortNotice.body}</p>
        </HeroCard>
      )}

      {/* The goal itself, tracked by the only number that actually answers "am I close?" —
          the furthest single run so far, not minutes on the clock. */}
      {!isComplete && (
        <div className="relative overflow-hidden bg-midnight-raised border border-border-ichor rounded-2xl p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-momentum/[0.07] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className={`${EYEBROW} text-momentum flex items-center gap-1.5 mb-2`}>
              <Target className="w-3.5 h-3.5" /> {PROGRAM_GOAL_LABEL}
            </div>
            {/* The distance is the headline, not a caption — it's the number the whole plan
                is chasing, and it was previously the smallest text in the card. */}
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-3xl font-bold tabular-nums leading-none">
                {longestRunKm > 0 ? longestRunKm.toFixed(1) : "0.0"}
              </span>
              <span className="text-sm text-white/40 font-medium">/ {PROGRAM_GOAL_KM} km</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <div className="h-full bg-momentum transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="text-xs text-white/50">
              {longestRunKm <= 0
                ? "Your longest run will show up here once you log your first session."
                : longestRunKm >= PROGRAM_GOAL_KM
                  ? "You've already covered 5K in a single run. Finish the stages and it's official."
                  : `Longest run so far — ${(PROGRAM_GOAL_KM - longestRunKm).toFixed(1)} km to go.`}
            </p>
          </div>
        </div>
      )}

      {!isComplete && (
        <div className="bg-midnight-raised/60 border border-border-ichor rounded-2xl p-4">
          <p className={`${SECTION_HEADING} mb-3`}>How this works, in plain terms</p>
          <ul className="space-y-2.5">
            {HOW_IT_WORKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 text-momentum shrink-0 mt-px" />
                <span className="text-xs text-white/55 leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isComplete ? (
        <div className="bg-momentum/10 border border-momentum/30 rounded-2xl p-6 text-center space-y-4">
          <PartyPopper className="w-10 h-10 text-momentum mx-auto" />
          <h2 className="font-display italic font-bold text-xl">You ran your first 5K 🎉</h2>
          <p className="text-sm text-white/60">
            Not long ago you were starting with one-minute jogs. You just covered five kilometres. That&apos;s a
            distance most people never run in their life, and you got there by showing up. You&apos;re ready for the
            full ICHOR experience — territory, clans, all of it — whenever you want it. Staying in
            Beginner-Friendly Mode is just as fine, too.
          </p>
          <button
            onClick={() => handleToggle(false)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-momentum text-midnight font-bold py-3.5 rounded-full disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Switch to the full experience"}
          </button>
        </div>
      ) : (
        <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="font-bold text-lg leading-none">Stage {week}<span className="text-white/35 text-sm font-medium"> of {totalWeeks}</span></span>
            <span className={`${EYEBROW} text-white/35`}>{currentWeekData.title}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2.5">
            <div className="h-full bg-momentum transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/50">
            <span className="text-white/80 font-semibold tabular-nums">{sessionsThisWeek} of {sessionsTargetThisWeek}</span> sessions done in this stage
            <span className="text-white/30"> · {completedSessionsTotal} of {totalSessionsInProgram} overall</span>
          </p>
        </div>
      )}

      <div>
        <h2 className={`${SECTION_HEADING} mb-3`}>This stage&apos;s sessions</h2>
        <div className="space-y-2.5">
          {currentWeekData.sessions.map((s, i) => {
            const done = i < sessionsThisWeek;
            const isNext = !isComplete && i === nextSessionIndex;
            return (
              <div
                key={s.label}
                className={`relative overflow-hidden rounded-2xl border transition-colors ${
                  done
                    ? "bg-momentum/10 border-momentum/30"
                    : isNext
                      ? "bg-midnight-raised border-momentum/50 p-5 shadow-[0_0_0_1px_rgba(255,148,102,0.08)]"
                      : "bg-midnight-raised/60 border-border-ichor"
                } ${isNext ? "" : "p-4"}`}
              >
                <div className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-momentum" />
                  ) : (
                    <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${isNext ? "text-momentum" : "text-white/20"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={isNext ? "text-base font-bold" : "text-sm font-semibold text-white/70"}>{s.label}</p>
                      {/* The number this session is actually checked against, stated up front
                          so nobody has to guess what "counts". */}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
                        {targetLabel(s)}
                      </span>
                      {isNext && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-momentum bg-momentum/15 px-2 py-0.5 rounded-full">
                          Up next
                        </span>
                      )}
                    </div>
                    {/* The session you're actually about to do gets the full checklist — one
                        action per line, rests included, bookended by the Strava start/stop so
                        it's unmistakable that this is ONE recording, not one per interval.
                        Other sessions stay as a one-liner so the page doesn't become a wall. */}
                    {isNext ? (
                      <ol className="mt-2.5 space-y-2">
                        {[SESSION_START_STEP, ...s.steps, SESSION_END_STEP].map((step, n) => {
                          const isBookend = n === 0 || n === s.steps.length + 1;
                          return (
                            <li key={n} className="flex items-start gap-2.5">
                              <span
                                className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums mt-px ${
                                  isBookend ? "bg-[#FC4C02]/20 text-[#FC4C02]" : "bg-white/10 text-white/60"
                                }`}
                              >
                                {n + 1}
                              </span>
                              <span className={`text-xs leading-relaxed flex-1 ${isBookend ? "text-white/70" : "text-white/60"}`}>
                                {step.text}
                              </span>
                              {step.time && (
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-momentum bg-momentum/10 px-2 py-0.5 rounded-full mt-px">
                                  {step.time}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="text-xs text-white/50 mt-0.5">{s.summary}</p>
                    )}
                  </div>
                </div>
                {/* Deliberately a quiet secondary link, not a primary button: the checklist above
                    ends with "nothing else to do", and a big "Log this session" CTA would flatly
                    contradict that. This is only the fallback for a run Strava didn't capture. */}
                {isNext && !restNotice && (
                  <Link
                    href="/post/create"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
                  >
                    Didn&apos;t record it on Strava? Add it by hand <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The whole road ahead, folded away by default — reassuring to be able to see, but not
          something a first-timer should have to scroll past on every visit. */}
      <div>
        <button
          onClick={() => setShowJourney((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-white/60 hover:text-white/80 transition-colors"
        >
          <span>See the whole journey ({totalWeeks} stages)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showJourney ? "rotate-180" : ""}`} />
        </button>
        {showJourney && (
          <div className="mt-3 space-y-1.5">
            {PROGRAM_WEEKS.map((w) => {
              const isPast = w.week < week;
              const isCurrent = w.week === week && !isComplete;
              return (
                <div
                  key={w.week}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                    isCurrent ? "bg-momentum/10 border-momentum/30" : "bg-midnight-raised border-border-ichor"
                  }`}
                >
                  <span className={`text-xs font-bold tabular-nums ${isPast || isCurrent ? "text-momentum" : "text-white/25"}`}>
                    {String(w.week).padStart(2, "0")}
                  </span>
                  <span className={`text-sm flex-1 ${isPast || isCurrent ? "text-white/80" : "text-white/40"}`}>{w.title}</span>
                  {isPast && <CheckCircle2 className="w-4 h-4 text-momentum shrink-0" />}
                  {isCurrent && <span className="text-[10px] font-bold uppercase tracking-wide text-momentum">You&apos;re here</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tipsByTier().map((group) => (
        <div key={group.tier}>
          <h2 className={`${SECTION_HEADING} mb-3 flex items-center gap-2`}>
            {group.label}
            {group.tier === "must-know" && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-ignite bg-ignite/15 px-2 py-0.5 rounded-full">
                Read first
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {group.tips.map((tip) => (
              <div key={tip.id} className="bg-midnight-raised border border-border-ichor rounded-2xl p-4">
                <p className="text-sm font-semibold mb-1">{tip.title}</p>
                <p className="text-xs text-white/50">{tip.body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
