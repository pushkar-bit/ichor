"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Swords, ShieldAlert, Trophy, Crosshair, Flame, TrendingUp, CalendarDays, Grid3x3,
  Flag, Sparkles, History, Users, Target, MessageCircle, X, ChevronRight,
  Percent, Sunrise, AlertTriangle, Gauge, CalendarClock,
} from "lucide-react";
import type { ForYouCard } from "@/lib/forYou";
import { Countdown } from "./BattleSheets";

/**
 * The "For You" rail that fronts the feed: a ranked strip of cards the server chose for THIS
 * viewer at THIS moment. The top-priority card is the full-width hero; the rest form a
 * horizontal shelf. Cards are dismissible for the session so a nudge doesn't nag.
 */

type Presentation = {
  accent: string; // text/icon color
  border: string;
  glow: string; // subtle bg tint
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body?: ReactNode;
  href?: string;
  cta?: string;
};

function fmtPace(minPerKm: number): string {
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Locale-independent "Mon D" formatting — toLocaleDateString varies by the server's vs. the
 * browser's locale/ICU config (e.g. "1 Sept" vs "Sep 1"), which is a hydration mismatch on an
 * SSR'd card. Fixed month names render identically everywhere. */
function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function describe(card: ForYouCard): Presentation {
  switch (card.kind) {
    case "under_attack":
      return {
        accent: "text-ignite", border: "border-ignite/40", glow: "bg-ignite/10",
        icon: <ShieldAlert className="w-5 h-5" />, eyebrow: "Under attack",
        title: `${card.territoryName} is being contested`,
        body: <>Respond before <Countdown to={card.respondBy} suffix=" left" expiredText="the clock runs out" /> — silence only costs you land if their run beat yours.</>,
        href: `/map?battle=${card.battleId}&sheet=respond`, cta: "Respond now",
      };
    case "duel_soon":
      return {
        accent: "text-ignite", border: "border-ignite/40", glow: "bg-ignite/10",
        icon: <Swords className="w-5 h-5" />, eyebrow: "Duel scheduled",
        title: `Duel for ${card.territoryName}`,
        body: <>Window opens in <Countdown to={card.windowStart} prefix="" suffix="" expiredText="now — go!" />. Run inside the territory to defend it.</>,
        href: `/map?battle=${card.battleId}`, cta: "View duel",
      };
    case "battle_resolved": {
      const map = {
        won: { eyebrow: "Victory", title: `You took ${card.territoryName}`, accent: "text-lime" as const },
        lost: { eyebrow: "Defeat", title: `${card.territoryName} slipped away`, accent: "text-ignite" as const },
        split: { eyebrow: "Land divided", title: `${card.territoryName} was split`, accent: "text-momentum" as const },
        forfeit: { eyebrow: "Forfeit", title: `Nobody ran for ${card.territoryName}`, accent: "text-white/70" as const },
      }[card.outcome];
      return {
        accent: map.accent, border: "border-border-ichor", glow: "bg-white/5",
        icon: <Trophy className="w-5 h-5" />, eyebrow: map.eyebrow, title: map.title,
        body: "Fog of war has lifted — see both runs.",
        href: `/map?battle=${card.battleId}&sheet=reveal`, cta: "See the reveal",
      };
    }
    case "attack_opportunity":
      return {
        accent: "text-ignite", border: "border-ignite/30", glow: "bg-ignite/10",
        icon: <Crosshair className="w-5 h-5" />, eyebrow: "Attack opportunity",
        title: `You covered ${card.coveragePct}% of ${card.territoryName}`,
        body: "Enough to launch an attack from the map.",
        href: `/map`, cta: "Open the map",
      };
    case "post_run_kudos":
      return {
        accent: card.isPB ? "text-lime" : "text-momentum", border: card.isPB ? "border-lime/40" : "border-momentum/30",
        glow: card.isPB ? "bg-lime/10" : "bg-momentum/10",
        icon: card.isPB ? <Trophy className="w-5 h-5" /> : <Flame className="w-5 h-5" />,
        eyebrow: card.isPB ? "Personal best" : "Nice run", title: card.headline, body: card.detail,
      };
    case "streak":
      return {
        accent: card.atRisk ? "text-ignite" : "text-lime", border: card.atRisk ? "border-ignite/40" : "border-lime/30",
        glow: card.atRisk ? "bg-ignite/10" : "bg-lime/10", icon: <Flame className="w-5 h-5" />,
        eyebrow: `${card.streakDays}-day streak`,
        title: card.atRisk ? "Your streak is on the line" : `${card.streakDays} days strong 🔥`,
        body: card.atRisk
          ? <>Log a run today to keep it alive.{card.freezes > 0 ? ` You have ${card.freezes} streak freeze${card.freezes > 1 ? "s" : ""} as backup.` : ""}</>
          : "Keep the chain going.",
        href: card.atRisk ? "/post/create" : undefined, cta: card.atRisk ? "Log a run" : undefined,
      };
    case "weekly":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <TrendingUp className="w-5 h-5" />, eyebrow: "This week",
        title: `${card.distanceKm} km · ${card.runs} run${card.runs === 1 ? "" : "s"}`,
        body: (
          <>
            {card.calories.toLocaleString()} cal{card.bestPaceMinPerKm != null ? ` · best ${fmtPace(card.bestPaceMinPerKm)}` : ""}
            {card.vsLastWeekPct != null && (
              <span className={card.vsLastWeekPct >= 0 ? "text-lime" : "text-white/50"}>
                {" "}· {card.vsLastWeekPct >= 0 ? "+" : ""}{card.vsLastWeekPct}% vs last week
              </span>
            )}
          </>
        ),
      };
    case "milestone":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <Flag className="w-5 h-5" />, eyebrow: "Milestone in sight",
        title: `${card.remainingKm} km from ${card.label}`, body: "So close — one or two runs gets you there.",
      };
    case "comeback":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <Sparkles className="w-5 h-5" />, eyebrow: "Welcome back",
        title: `First run in ${card.daysAway} days`, body: "Ease back in — momentum matters more than pace right now.",
      };
    case "on_this_day":
      return {
        accent: "text-white/80", border: "border-border-ichor", glow: "bg-white/5",
        icon: <History className="w-5 h-5" />, eyebrow: "On this day",
        title: `${card.yearsAgo} year${card.yearsAgo > 1 ? "s" : ""} ago today`,
        body: `You logged a ${card.distanceKm.toFixed(1)} km ${card.activityType.toLowerCase()}. Time for a rematch?`,
      };
    case "clan_pulse":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <Users className="w-5 h-5" />, eyebrow: card.clanName,
        title: `${card.ranToday} clanmate${card.ranToday === 1 ? "" : "s"} already ran today`,
        body: "Don't be the one who sat it out.",
      };
    case "todays_mission":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <Target className="w-5 h-5" />, eyebrow: "Today's mission", title: card.text,
        href: "/post/create", cta: "Log it",
      };
    case "coach_tip":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <MessageCircle className="w-5 h-5" />, eyebrow: "Your coach", title: card.text,
        href: "/coach", cta: "Open coach",
      };
    case "leaderboard_move":
      return {
        accent: "text-lime", border: "border-lime/30", glow: "bg-lime/10",
        icon: <Trophy className="w-5 h-5" />, eyebrow: "Leaderboard",
        title: `You're #${card.rank} in ${card.category}`, body: "Hold your ground — or climb.",
        href: "/leaderboard", cta: "View leaderboard",
      };
    case "rival":
      return {
        accent: "text-ignite", border: "border-ignite/30", glow: "bg-ignite/10",
        icon: <Target className="w-5 h-5" />, eyebrow: `Chasing ${card.rivalName}`,
        title: `${card.behindBy} ${card.metric === "distance" ? "km" : "pts"} behind`, body: card.gapText,
        href: "/leaderboard", cta: "See the gap",
      };
    case "percentile":
      return {
        accent: "text-lime", border: "border-lime/30", glow: "bg-lime/10",
        icon: <Percent className="w-5 h-5" />, eyebrow: "This week",
        title: `Faster than ${card.percentile}% of the club`,
        body: `Based on ${card.sampleSize} runners' distance this week.`,
      };
    case "best_time":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <Sunrise className="w-5 h-5" />, eyebrow: "Your best time to run",
        title: `You run ${card.paceGapSeconds}s/km faster in the ${card.timeLabel}`,
        body: "Worth planning your key runs around this window.",
      };
    case "skip_risk":
      return {
        accent: "text-ignite", border: "border-ignite/40", glow: "bg-ignite/10",
        icon: <AlertTriangle className="w-5 h-5" />, eyebrow: "Pattern spotted",
        title: `You usually skip ${card.dayName}s`,
        body: `Missed ${card.missRatePct}% of recent ${card.dayName}s — a short run today breaks the pattern.`,
        href: "/post/create", cta: "Log a quick run",
      };
    case "race_predictor":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <Gauge className="w-5 h-5" />, eyebrow: "Race time predictor",
        title: `Projected from your ${card.basedOnKm}km effort`,
        body: (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {card.predictions.map((p) => (
              <span key={p.label}>{p.label}: <span className="text-white/80 font-medium">{p.time}</span></span>
            ))}
          </div>
        ),
      };
    case "goal_projection":
      return {
        accent: "text-momentum", border: "border-momentum/30", glow: "bg-momentum/10",
        icon: <CalendarClock className="w-5 h-5" />, eyebrow: "Goal projection",
        title: `${card.targetKm} km by ${fmtShortDate(card.etaDate)}`,
        body: "At your current pace of running — keep the weeks consistent to hit it on time.",
      };
    default:
      return { accent: "text-white/70", border: "border-border-ichor", glow: "bg-white/5", icon: <Sparkles className="w-5 h-5" />, eyebrow: "For you", title: "" };
  }
}

/** GitHub-style activity calendar — 12 columns (weeks) × 7 rows (days). */
function Heatmap({ days }: { days: { date: string; level: number }[] }) {
  const levelClass = ["bg-white/5", "bg-momentum/25", "bg-momentum/45", "bg-momentum/70", "bg-momentum"];
  // Group into weeks of 7, oldest first (already ordered oldest→newest from the engine).
  const weeks: { date: string; level: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return (
    <div className="flex gap-[3px]">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((d) => (
            <div key={d.date} className={`w-2.5 h-2.5 rounded-[2px] ${levelClass[d.level]}`} title={`${d.date}: level ${d.level}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardShell({
  card, hero, onDismiss,
}: { card: ForYouCard; hero: boolean; onDismiss: () => void }) {
  const p = describe(card);
  const isHeatmap = card.kind === "heatmap";

  const inner = (
    <div className={`relative h-full ${p.glow} border ${p.border} rounded-2xl p-4 ${hero ? "" : "min-w-[240px] max-w-[280px]"} transition-colors`}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
        aria-label="Dismiss"
        className="absolute top-2.5 right-2.5 text-white/25 hover:text-white/60 z-10"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {isHeatmap && card.kind === "heatmap" ? (
        <>
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${p.accent} mb-2`}>
            <CalendarDays className="w-4 h-4" /> Last 12 weeks · {card.totalDays} active days
          </div>
          <Heatmap days={card.days} />
        </>
      ) : (
        <>
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${p.accent} mb-1.5`}>
            {p.icon} {p.eyebrow}
          </div>
          <div className={`font-semibold leading-snug ${hero ? "text-lg" : "text-sm"} pr-4`}>{p.title}</div>
          {p.body && <div className={`text-white/55 mt-1 ${hero ? "text-sm" : "text-xs"} leading-snug`}>{p.body}</div>}
          {p.href && p.cta && (
            <div className={`inline-flex items-center gap-1 mt-3 font-semibold ${p.accent} ${hero ? "text-sm" : "text-xs"}`}>
              {p.cta} <ChevronRight className="w-3.5 h-3.5" />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (p.href) {
    return <Link href={p.href} className="block h-full">{inner}</Link>;
  }
  return inner;
}

export function ForYouRail({ cards }: { cards: ForYouCard[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(sessionStorage.getItem("ichor.forYouDismissed") ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const visible = useMemo(() => cards.filter((c) => !dismissed.has(c.id)), [cards, dismissed]);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      try {
        sessionStorage.setItem("ichor.forYouDismissed", JSON.stringify([...next]));
      } catch {
        /* private mode — session-only dismissal still works via state */
      }
      return next;
    });
  }

  if (visible.length === 0) return null;
  const [hero, ...rest] = visible;

  return (
    <section className="mb-6" aria-label="For you">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Sparkles className="w-4 h-4 text-momentum" />
        <h2 className="text-sm font-semibold text-white/60">For you</h2>
      </div>

      <CardShell card={hero} hero onDismiss={() => dismiss(hero.id)} />

      {rest.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          {rest.map((c) => (
            <CardShell key={c.id} card={c} hero={false} onDismiss={() => dismiss(c.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
