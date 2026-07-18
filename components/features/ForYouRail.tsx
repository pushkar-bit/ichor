"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Swords, ShieldAlert, Trophy, Crosshair, Flame, TrendingUp, CalendarDays,
  Flag, Sparkles, History, Users, Target, MessageCircle, X, ChevronRight,
  Percent, Sunrise, AlertTriangle, Gauge, CalendarClock,
} from "lucide-react";
import type { ForYouCard } from "@/lib/forYou";
import { Countdown } from "./Countdown";

/**
 * The "For You" rail that fronts the feed: a ranked strip of items the server chose for THIS
 * viewer at THIS moment. The top-priority item is a full-width lead line; the rest flow in a
 * single horizontally-scrolling strip separated by hairline dividers — no per-item card
 * chrome (no boxes/backgrounds), so it reads as one continuous surface rather than a stack of
 * tiles. Items are dismissible for the session so a nudge doesn't nag.
 */

type Presentation = {
  accent: string; // text/icon color
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
        accent: "text-ignite",
        icon: <ShieldAlert className="w-5 h-5" />, eyebrow: "Under attack",
        title: `${card.territoryName} is being contested`,
        body: <>Respond before <Countdown to={card.respondBy} suffix=" left" expiredText="the clock runs out" /> — silence only costs you land if their run beat yours.</>,
        href: `/map?battle=${card.battleId}&sheet=respond`, cta: "Respond now",
      };
    case "duel_soon":
      return {
        accent: "text-ignite",
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
        accent: map.accent,
        icon: <Trophy className="w-5 h-5" />, eyebrow: map.eyebrow, title: map.title,
        body: "Fog of war has lifted — see both runs.",
        href: `/map?battle=${card.battleId}&sheet=reveal`, cta: "See the reveal",
      };
    }
    case "attack_opportunity":
      return {
        accent: "text-ignite",
        icon: <Crosshair className="w-5 h-5" />, eyebrow: "Attack opportunity",
        title: `You covered ${card.coveragePct}% of ${card.territoryName}`,
        body: "Enough to launch an attack from the map.",
        href: `/map`, cta: "Open the map",
      };
    case "post_run_kudos":
      return {
        accent: card.isPB ? "text-lime" : "text-momentum",
        icon: card.isPB ? <Trophy className="w-5 h-5" /> : <Flame className="w-5 h-5" />,
        eyebrow: card.isPB ? "Personal best" : "Nice run", title: card.headline, body: card.detail,
      };
    case "streak":
      return {
        accent: card.atRisk ? "text-ignite" : "text-lime",
        icon: <Flame className="w-5 h-5" />,
        eyebrow: `${card.streakDays}-day streak`,
        title: card.atRisk ? "Your streak is on the line" : `${card.streakDays} days strong 🔥`,
        body: card.atRisk
          ? <>Log a run today to keep it alive.{card.freezes > 0 ? ` You have ${card.freezes} streak freeze${card.freezes > 1 ? "s" : ""} as backup.` : ""}</>
          : "Keep the chain going.",
        href: card.atRisk ? "/post/create" : undefined, cta: card.atRisk ? "Log a run" : undefined,
      };
    case "weekly":
      return {
        accent: "text-momentum",
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
        accent: "text-momentum",
        icon: <Flag className="w-5 h-5" />, eyebrow: "Milestone in sight",
        title: `${card.remainingKm} km from ${card.label}`, body: "So close — one or two runs gets you there.",
      };
    case "comeback":
      return {
        accent: "text-momentum",
        icon: <Sparkles className="w-5 h-5" />, eyebrow: "Welcome back",
        title: `First run in ${card.daysAway} days`, body: "Ease back in — momentum matters more than pace right now.",
      };
    case "on_this_day":
      return {
        accent: "text-white/80",
        icon: <History className="w-5 h-5" />, eyebrow: "On this day",
        title: `${card.yearsAgo} year${card.yearsAgo > 1 ? "s" : ""} ago today`,
        body: `You logged a ${card.distanceKm.toFixed(1)} km ${card.activityType.toLowerCase()}. Time for a rematch?`,
      };
    case "clan_pulse":
      return {
        accent: "text-momentum",
        icon: <Users className="w-5 h-5" />, eyebrow: card.clanName,
        title: `${card.ranToday} clanmate${card.ranToday === 1 ? "" : "s"} already ran today`,
        body: "Don't be the one who sat it out.",
      };
    case "todays_mission":
      return {
        accent: "text-momentum",
        icon: <Target className="w-5 h-5" />, eyebrow: "Today's mission", title: card.text,
        href: "/post/create", cta: "Log it",
      };
    case "coach_tip":
      return {
        accent: "text-momentum",
        icon: <MessageCircle className="w-5 h-5" />, eyebrow: "Your coach", title: card.text,
        href: "/coach", cta: "Open coach",
      };
    case "leaderboard_move":
      return {
        accent: "text-lime",
        icon: <Trophy className="w-5 h-5" />, eyebrow: "Leaderboard",
        title: `You're #${card.rank} in ${card.category}`, body: "Hold your ground — or climb.",
        href: "/leaderboard", cta: "View leaderboard",
      };
    case "rival":
      return {
        accent: "text-ignite",
        icon: <Target className="w-5 h-5" />, eyebrow: `Chasing ${card.rivalName}`,
        title: `${card.behindBy} ${card.metric === "distance" ? "km" : "pts"} behind`, body: card.gapText,
        href: "/leaderboard", cta: "See the gap",
      };
    case "percentile":
      return {
        accent: "text-lime",
        icon: <Percent className="w-5 h-5" />, eyebrow: "This week",
        title: `Faster than ${card.percentile}% of the club`,
        body: `Based on ${card.sampleSize} runners' distance this week.`,
      };
    case "best_time":
      return {
        accent: "text-momentum",
        icon: <Sunrise className="w-5 h-5" />, eyebrow: "Your best time to run",
        title: `You run ${card.paceGapSeconds}s/km faster in the ${card.timeLabel}`,
        body: "Worth planning your key runs around this window.",
      };
    case "skip_risk":
      return {
        accent: "text-ignite",
        icon: <AlertTriangle className="w-5 h-5" />, eyebrow: "Pattern spotted",
        title: `You usually skip ${card.dayName}s`,
        body: `Missed ${card.missRatePct}% of recent ${card.dayName}s — a short run today breaks the pattern.`,
        href: "/post/create", cta: "Log a quick run",
      };
    case "race_predictor":
      return {
        accent: "text-momentum",
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
        accent: "text-momentum",
        icon: <CalendarClock className="w-5 h-5" />, eyebrow: "Goal projection",
        title: `${card.targetKm} km by ${fmtShortDate(card.etaDate)}`,
        body: "At your current pace of running — keep the weeks consistent to hit it on time.",
      };
    default:
      return { accent: "text-white/70", icon: <Sparkles className="w-5 h-5" />, eyebrow: "For you", title: "" };
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

/** The hero: the single highest-priority item, given real presence via a soft accent wash
 * behind it (no hard box), a large icon chip, a prominent title, and a clear CTA. */
function Lead({ card, onDismiss, showDismiss }: { card: ForYouCard; onDismiss: () => void; showDismiss: boolean }) {
  const p = describe(card);
  const { glow } = accentStyles(p.accent);

  const content = (
    <div className="group relative overflow-hidden rounded-2xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} via-transparent to-transparent pointer-events-none`} />
      <div className="relative flex items-start gap-4 p-4">
        <IconChip accent={p.accent} size="lg">{p.icon}</IconChip>
        <div className="flex-1 min-w-0">
          <div className={`text-[11px] font-bold uppercase tracking-[0.15em] ${p.accent}`}>{p.eyebrow}</div>
          <div className="font-bold leading-tight text-xl mt-1">{p.title}</div>
          {p.body && <div className="text-white/60 text-sm mt-1.5 leading-snug">{p.body}</div>}
          {p.href && p.cta && (
            <div className={`inline-flex items-center gap-1.5 mt-3 font-semibold text-sm ${p.accent}`}>
              {p.cta} <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
        {showDismiss && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
            aria-label="Dismiss"
            className="shrink-0 text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return p.href ? <Link href={p.href} className="block">{content}</Link> : content;
}

/** Per-accent visual tokens: the tinted chip an icon sits in, and the soft gradient wash behind
 * the hero. Kept as literal class strings so Tailwind's JIT picks them up. */
function accentStyles(accent: string): { chip: string; glow: string } {
  if (accent.includes("ignite")) return { chip: "bg-ignite/15", glow: "from-ignite/10" };
  if (accent.includes("lime")) return { chip: "bg-lime/15", glow: "from-lime/10" };
  if (accent.includes("momentum")) return { chip: "bg-momentum/15", glow: "from-momentum/10" };
  return { chip: "bg-white/10", glow: "from-white/[0.06]" };
}

/** Themed buckets so the rail reads as an intentional briefing — "do this", "compete", "track
 * progress" — instead of a flat priority dump. The hero is pulled out above these. */
type ForYouGroup = "act" | "compete" | "progress";
function groupOf(kind: ForYouCard["kind"]): ForYouGroup {
  switch (kind) {
    case "under_attack":
    case "duel_soon":
    case "attack_opportunity":
    case "streak":
    case "skip_risk":
    case "todays_mission":
    case "comeback":
    case "coach_tip":
      return "act";
    case "leaderboard_move":
    case "rival":
    case "percentile":
    case "clan_pulse":
    case "battle_resolved":
      return "compete";
    default:
      return "progress";
  }
}
const GROUP_LABEL: Record<ForYouGroup, string> = {
  act: "On your radar",
  compete: "You vs the club",
  progress: "Your progress",
};

/** The consistent icon anchor used across hero and rows — a tinted rounded chip. */
function IconChip({ accent, size, children }: { accent: string; size: "lg" | "sm"; children: ReactNode }) {
  const { chip } = accentStyles(accent);
  return (
    <span className={`inline-flex items-center justify-center rounded-xl shrink-0 ${chip} ${accent} ${size === "lg" ? "w-11 h-11" : "w-9 h-9"}`}>
      {children}
    </span>
  );
}

/** A secondary item: an icon chip anchoring an eyebrow / title / body. No box or border —
 * the chip + generous grid gap carry the rhythm. Bodies are clamped so uneven text lengths
 * don't leave ragged gaps in the grid. */
function GridItem({
  card, onDismiss, showDismiss,
}: { card: ForYouCard; onDismiss: () => void; showDismiss: boolean }) {
  const isHeatmap = card.kind === "heatmap";
  const p = isHeatmap ? null : describe(card);
  const accent = p ? p.accent : "text-momentum";
  const outerClass = `group relative flex items-start gap-3 ${isHeatmap ? "sm:col-span-2" : ""}`;

  const inner = (
    <>
      <IconChip accent={accent} size="sm">
        {isHeatmap ? <CalendarDays className="w-4 h-4" /> : p!.icon}
      </IconChip>

      <div className="flex-1 min-w-0">
        {isHeatmap && card.kind === "heatmap" ? (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-momentum">
              Last 12 weeks · {card.totalDays} active days
            </div>
            <div className="mt-2"><Heatmap days={card.days} /></div>
          </>
        ) : p ? (
          <>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${p.accent}`}>{p.eyebrow}</div>
            <div className="font-semibold leading-snug text-sm mt-0.5">{p.title}</div>
            {p.body && <div className="text-white/50 text-xs mt-1 leading-snug line-clamp-2">{p.body}</div>}
            {p.href && p.cta && (
              <div className={`inline-flex items-center gap-1 mt-1.5 font-semibold text-xs ${p.accent}`}>
                {p.cta} <ChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
          </>
        ) : null}
      </div>

      {showDismiss && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
          aria-label="Dismiss"
          className="shrink-0 text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </>
  );

  if (p?.href) {
    return <Link href={p.href} className={outerClass}>{inner}</Link>;
  }
  return <div className={outerClass}>{inner}</div>;
}

export function ForYouRail({ cards, dismissible = true }: { cards: ForYouCard[]; dismissible?: boolean }) {
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

  // Bucket the non-hero items into themed sections (preserving priority order within each).
  // Section labels only appear once there are enough items to warrant the structure — a short
  // list reads better as a single ungrouped grid.
  const useGroups = rest.length >= 4;
  const groups = (["act", "compete", "progress"] as ForYouGroup[])
    .map((g) => ({ key: g, label: GROUP_LABEL[g], items: rest.filter((c) => groupOf(c.kind) === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="mb-3" aria-label="For you">
      {/* Redundant once this lives in its own "For You" tab — only needed as an ambient
          banner heading when embedded above another view. */}
      {dismissible && (
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-momentum" />
          <h2 className="text-sm font-semibold text-white/60">For you</h2>
        </div>
      )}

      <Lead card={hero} onDismiss={() => dismiss(hero.id)} showDismiss={dismissible} />

      {rest.length > 0 &&
        (useGroups ? (
          <div className="mt-6 space-y-7">
            {groups.map((g) => (
              <div key={g.key}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35 mb-3.5">{g.label}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {g.items.map((c) => (
                    <GridItem key={c.id} card={c} onDismiss={() => dismiss(c.id)} showDismiss={dismissible} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
            {rest.map((c) => (
              <GridItem key={c.id} card={c} onDismiss={() => dismiss(c.id)} showDismiss={dismissible} />
            ))}
          </div>
        ))}
    </section>
  );
}
