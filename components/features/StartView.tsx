"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, CheckCircle2, PartyPopper, Loader2, Heart, Circle, Moon,
  CalendarCheck, Unlock, Leaf, ChevronDown, ArrowRight,
} from "lucide-react";
import { tipsByTier, PROGRAM_WEEKS, type ProgramProgress } from "@/lib/beginnerProgram";

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
    | { optedIn: true; name: string; progress: ProgramProgress; quote: string; restNotice?: RestNotice },
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
        <h1 className="font-display italic font-bold text-2xl">New to running?</h1>
        <p className="text-sm text-white/60">
          Turn on Beginner-Friendly Mode for a guided 8-stage walk/run program that moves at your pace — not a fixed
          calendar — plus safety tips written for a first-timer and a warmer, calmer version of the whole app. No
          leaderboard pressure, no one can raid your ground while you're building your base.
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
        <p className="text-sm text-white/60">Here's your plan — one stage at a time, no pressure.</p>
      </div>

      {!isComplete && (
        <div className="bg-midnight-raised/60 border border-border-ichor rounded-2xl p-4">
          <p className="text-xs font-semibold text-white/80 mb-3">How this works, in plain terms</p>
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

      {restNotice && (
        <div className="bg-midnight-raised border border-momentum/30 rounded-2xl p-4 flex items-start gap-3">
          <Moon className="w-5 h-5 text-momentum shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">{restNotice.title}</p>
            <p className="text-xs text-white/50 leading-relaxed">{restNotice.body}</p>
          </div>
        </div>
      )}

      {isComplete ? (
        <div className="bg-momentum/10 border border-momentum/30 rounded-2xl p-6 text-center space-y-4">
          <PartyPopper className="w-10 h-10 text-momentum mx-auto" />
          <h2 className="font-display italic font-bold text-xl">You finished the program 🎉</h2>
          <p className="text-sm text-white/60">
            Not long ago you were just getting started. Now you're a runner. You're ready for the full ICHOR
            experience — territory, clans, all of it — whenever you want it. Staying in Beginner-Friendly Mode is
            just as fine, too.
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
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-semibold text-sm">Stage {week} of {totalWeeks}</span>
            <span className="text-xs text-white/40">{currentWeekData.title}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
            <div className="h-full bg-momentum transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/50">
            {sessionsThisWeek} of {sessionsTargetThisWeek} sessions done in this stage
            <span className="text-white/30"> · {completedSessionsTotal} of {totalSessionsInProgram} overall</span>
          </p>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-3">This stage&apos;s sessions</h2>
        <div className="space-y-2.5">
          {currentWeekData.sessions.map((s, i) => {
            const done = i < sessionsThisWeek;
            const isNext = !isComplete && i === nextSessionIndex;
            return (
              <div
                key={s.label}
                className={`rounded-2xl border p-4 ${
                  done
                    ? "bg-momentum/10 border-momentum/30"
                    : isNext
                      ? "bg-midnight-raised border-momentum/40"
                      : "bg-midnight-raised border-border-ichor"
                }`}
              >
                <div className="flex items-start gap-3">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-momentum" />
                  ) : (
                    <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${isNext ? "text-momentum" : "text-white/20"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{s.label}</p>
                      {isNext && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-momentum bg-momentum/15 px-2 py-0.5 rounded-full">
                          Up next
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{s.detail}</p>
                  </div>
                </div>
                {/* The plan is only half the job — this is the step that actually records it. */}
                {isNext && !restNotice && (
                  <Link
                    href="/post/create"
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-momentum text-midnight font-bold text-sm py-2.5 rounded-full"
                  >
                    Log this session <ArrowRight className="w-4 h-4" />
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
          <h2 className="font-semibold text-sm text-white/60 mb-3 flex items-center gap-2">
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
