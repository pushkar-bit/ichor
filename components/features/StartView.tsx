"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, PartyPopper, Loader2, Heart } from "lucide-react";
import { tipsByTier, type ProgramProgress } from "@/lib/beginnerProgram";

async function setBeginnerMode(on: boolean) {
  const res = await fetch("/api/users/beginner-mode", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ beginnerMode: on }),
  });
  return res.ok;
}

export function StartView(
  props:
    | { optedIn: false; name: string; quote: string }
    | { optedIn: true; name: string; progress: ProgramProgress; quote: string },
) {
  const [loading, setLoading] = useState(false);

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
  const { week, totalWeeks, sessionsThisWeek, sessionsTargetThisWeek, isComplete, currentWeekData } = progress;
  const pct = Math.round((week / totalWeeks) * 100);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="font-display italic font-bold text-2xl mb-1">Hey {name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-momentum italic mb-2">&ldquo;{quote}&rdquo;</p>
        <p className="text-sm text-white/60">Here's your plan — one stage at a time, no pressure.</p>
      </div>

      {!isComplete && (
        <div className="bg-midnight-raised/60 border border-border-ichor rounded-2xl p-4">
          <p className="text-xs text-white/50 leading-relaxed">
            <span className="text-white/80 font-semibold">How this works, in plain terms:</span> every stage below has a
            small number of sessions — nothing to memorize, just show up when you can. Finish this stage&apos;s sessions
            (with a real rest day between them, which is intentional — that&apos;s when your body actually adapts) and
            the next stage unlocks on its own. There&apos;s no clock counting down and nobody here comparing you to
            anyone else. Whatever pace gets you through it is the right pace.
          </p>
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
            <span className="font-semibold text-sm">Week {week} of {totalWeeks}</span>
            <span className="text-xs text-white/40">{currentWeekData.title}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
            <div className="h-full bg-momentum transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-white/50">
            {sessionsThisWeek} of {sessionsTargetThisWeek} sessions completed — the next stage unlocks once you finish these,
            not on a fixed date.
          </p>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-3">This week's sessions</h2>
        <div className="space-y-2.5">
          {currentWeekData.sessions.map((s, i) => {
            const done = i < sessionsThisWeek;
            return (
              <div
                key={s.label}
                className={`flex items-start gap-3 rounded-2xl border p-4 ${
                  done ? "bg-momentum/10 border-momentum/30" : "bg-midnight-raised border-border-ichor"
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${done ? "text-momentum" : "text-white/20"}`} />
                <div>
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{s.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
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
