"use client";

import Link from "next/link";
import { Crown, Flame, Map, ShieldAlert, Swords, Target, TrendingDown } from "lucide-react";
import type { TerritorySummary } from "@/lib/territorySummary";
import { Countdown } from "./Countdown";

/**
 * The always-present territory bar above the feed.
 *
 * Everything else that surfaces territory is conditional: a For-You card has to out-rank
 * twenty other card kinds for one slot, a notification has to be opened, a nav link has to be
 * looked for. This strip is unconditional — whatever else is happening, a runner opening the
 * app sees how much ground they hold and anything currently threatening it.
 *
 * One line, no chrome, no second feed. It reads left to right in order of urgency: something
 * needs answering > something is fading > what you hold > where you stand locally.
 */
export function TerritoryStrip({ summary }: { summary: TerritorySummary }) {
  const { held, valuePoints, fading, needsResponse, activeBattles, longestHoldDays, topDistrict, objective, landWar } =
    summary;

  // Nothing held and nothing in flight — a strip full of zeroes is worse than no strip, so
  // this becomes the one-line invitation instead.
  if (held === 0 && activeBattles === 0 && !objective) {
    return (
      <Link
        href="/map"
        className="mb-4 flex items-center gap-2.5 border-2 border-border-ichor bg-midnight-raised px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors"
      >
        <Map className="w-4 h-4 text-momentum shrink-0" />
        <span className="text-xs text-white/60">
          <span className="font-semibold text-white">You hold no ground yet.</span> Any GPS run over 2km claims the land
          it covers.
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/map"
      className="mb-4 flex items-center gap-x-4 gap-y-1 flex-wrap border-2 border-border-ichor bg-midnight-raised px-3.5 py-2.5 hover:bg-white/[0.03] transition-colors"
    >
      {needsResponse > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ignite">
          <ShieldAlert className="w-3.5 h-3.5" />
          {needsResponse} needs your answer
        </span>
      )}

      {needsResponse === 0 && activeBattles > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ignite/80">
          <Swords className="w-3.5 h-3.5" />
          {activeBattles} in battle
        </span>
      )}

      {fading > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F4A261]">
          <TrendingDown className="w-3.5 h-3.5" />
          {fading} fading
        </span>
      )}

      <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
        <Crown className="w-3.5 h-3.5 text-momentum" />
        <span className="font-semibold text-white">{held}</span> held · {valuePoints.toLocaleString()} pts
      </span>

      {longestHoldDays >= 7 && (
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-white/45">
          <Flame className="w-3.5 h-3.5 text-lime" />
          {longestHoldDays}d longest hold
        </span>
      )}

      {topDistrict && (
        <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-white/45">
          <Map className="w-3.5 h-3.5" />
          {topDistrict.sharePct}% of {topDistrict.district}
        </span>
      )}

      {objective && (
        <span className="inline-flex items-center gap-1.5 text-xs text-momentum">
          <Target className="w-3.5 h-3.5" />
          <span className="truncate max-w-[160px]">{objective.label}</span>
        </span>
      )}

      {landWar.isOpen && (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-lime">
          ⚔ Land War · <Countdown to={landWar.endsAt} suffix=" left" expiredText="closing" />
        </span>
      )}
    </Link>
  );
}
