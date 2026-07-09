import { Swords } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

type Stats = { name: string; avatarUrl: string; distanceKm: number; calories: number; streakDays: number };

function StatRow({ label, meValue, themValue, unit, decimals = 0 }: { label: string; meValue: number; themValue: number; unit: string; decimals?: number }) {
  const total = meValue + themValue;
  const mePct = total > 0 ? (meValue / total) * 100 : 50;
  const meWinning = meValue > themValue;
  const themWinning = themValue > meValue;

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className={cn("font-semibold", meWinning && "text-momentum")}>{meValue.toFixed(decimals)}</span>
        <span className="text-white/40 uppercase tracking-wide text-[10px]">{label}</span>
        <span className={cn("font-semibold", themWinning && "text-ignite")}>{themValue.toFixed(decimals)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden flex">
        <div className="bg-momentum h-full transition-all" style={{ width: `${mePct}%` }} />
        <div className="bg-ignite h-full transition-all" style={{ width: `${100 - mePct}%` }} />
      </div>
      <div className="sr-only">{unit}</div>
    </div>
  );
}

/** Head-to-head weekly comparison shown only on a followed user's profile — not a global ranking, just you vs. them. */
export function HeadToHeadCard({ me, them }: { me: Stats; them: Stats }) {
  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar src={me.avatarUrl} name={me.name} size={28} />
          <span className="text-sm font-semibold">You</span>
        </div>
        <Swords className="w-4 h-4 text-white/30 shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold truncate">{them.name}</span>
          <Avatar src={them.avatarUrl} name={them.name} size={28} />
        </div>
      </div>
      <div className="space-y-3">
        <StatRow label="km this week" meValue={me.distanceKm} themValue={them.distanceKm} unit="km" decimals={1} />
        <StatRow label="cal this week" meValue={me.calories} themValue={them.calories} unit="cal" />
        <StatRow label="day streak" meValue={me.streakDays} themValue={them.streakDays} unit="days" />
      </div>
    </div>
  );
}
