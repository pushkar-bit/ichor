"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Day = { day: string; type: string; distanceKm: number | null; targetCalories: number; notes: string };

const TYPE_COLOR: Record<string, string> = {
  Rest: "text-white/40 border-white/10",
  Easy: "text-lime border-lime/30",
  Tempo: "text-momentum border-momentum/30",
  Long: "text-afterrun border-afterrun/30",
  Sprint: "text-ignite border-ignite/30",
  "Cross-train": "text-white/60 border-white/20",
};

export function TrainingPlanCard() {
  const [plan, setPlan] = useState<Day[] | null>(null);

  useEffect(() => {
    fetch("/api/coach/training-plan", { method: "POST" })
      .then((r) => r.json())
      .then((data) => setPlan(data.plan))
      .catch(() => {});
  }, []);

  if (!plan) {
    return <div className="h-32 rounded-2xl skeleton" />;
  }

  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
      {plan.map((d) => (
        <div
          key={d.day}
          className={cn("shrink-0 w-32 rounded-2xl border bg-midnight-raised p-3", TYPE_COLOR[d.type] ?? "border-border-ichor")}
        >
          <div className="text-[10px] uppercase tracking-wide text-white/40">{d.day.slice(0, 3)}</div>
          <div className="text-sm font-semibold mb-1">{d.type}</div>
          {d.distanceKm ? <div className="text-xs text-white/60 mb-1">{d.distanceKm}km</div> : null}
          <p className="text-[11px] text-white/40 leading-snug">{d.notes}</p>
        </div>
      ))}
    </div>
  );
}
