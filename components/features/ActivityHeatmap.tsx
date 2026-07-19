"use client";

import { useEffect, useRef } from "react";
import { dayKey } from "@/lib/week";

export function ActivityHeatmap({ data }: { data: Record<string, number> }) {
  // The grid renders oldest-week-first (left) to today (right) — without this, a first-time
  // viewer only ever sees ~52 weeks of empty history at the left edge and never scrolls far
  // enough right to find their actual (recent) activity, which looks exactly like "nothing
  // is here" even when the data is real.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const days: { key: string; value: number }[] = [];
  const today = new Date();
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({ key, value: data[key] ?? 0 });
  }

  const max = Math.max(...days.map((d) => d.value), 1);
  const weeks: { key: string; value: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function intensity(value: number) {
    if (value === 0) return "rgba(255,255,255,0.06)";
    const ratio = Math.min(value / max, 1);
    const alpha = 0.25 + ratio * 0.75;
    return `rgba(174, 147, 244, ${alpha})`;
  }

  return (
    <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => (
              <div
                key={d.key}
                title={`${d.key}: ${d.value} cal`}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{ backgroundColor: intensity(d.value) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
