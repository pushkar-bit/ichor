import { CalendarClock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeeklyRecap } from "@/lib/weeklyRecap";

function DeltaStat({ label, value, unit, delta }: { label: string; value: number; unit: string; delta: number }) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta > 0 ? "text-lime" : delta < 0 ? "text-ignite" : "text-white/40";

  return (
    <div className="bg-midnight border border-border-ichor rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1">{label}</div>
      <div className="text-xl font-bold">
        {value.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-white/40">{unit}</span>
      </div>
      <div className={cn("flex items-center gap-1 text-[11px] font-medium mt-0.5", color)}>
        <Icon className="w-3 h-3" />
        {delta === 0 ? "Same as last week" : `${delta > 0 ? "+" : ""}${delta.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit} vs last week`}
      </div>
    </div>
  );
}

export function WeeklyRecapCard({ recap }: { recap: WeeklyRecap }) {
  const { rankChange, currentRank } = recap;
  const rankText =
    currentRank === null
      ? "Not ranked yet this week"
      : rankChange === null
      ? `#${currentRank} this week`
      : rankChange > 0
      ? `#${currentRank} — up ${rankChange} spot${rankChange === 1 ? "" : "s"}`
      : rankChange < 0
      ? `#${currentRank} — down ${Math.abs(rankChange)} spot${Math.abs(rankChange) === 1 ? "" : "s"}`
      : `#${currentRank} — holding steady`;

  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-4 h-4 text-momentum" />
        <h2 className="text-sm font-semibold">Your week</h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <DeltaStat label="Distance" value={recap.distanceKm} unit="km" delta={recap.distanceDeltaKm} />
        <DeltaStat label="Calories" value={recap.calories} unit="cal" delta={recap.caloriesDelta} />
      </div>
      <p className="text-xs text-white/50">{rankText} on the calorie leaderboard</p>
    </div>
  );
}
