"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function FlamePicker({
  postId,
  initialAvg,
  initialCount,
}: {
  postId: string;
  initialAvg: number;
  initialCount: number;
}) {
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function rate(value: number) {
    if (busy) return;
    setBusy(true);
    setMyRating(value);
    try {
      const res = await fetch(`/api/posts/${postId}/flame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvg(data.avgFlameRating);
        setCount(data.flameCount);
      }
    } finally {
      setBusy(false);
    }
  }

  const display = hover ?? myRating ?? Math.round(avg);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} flames`}
            onMouseEnter={() => setHover(n)}
            onClick={() => rate(n)}
            className="p-0.5 disabled:opacity-50"
            disabled={busy}
          >
            <Flame
              className={cn("w-[18px] h-[18px] transition-colors", n <= display ? "text-ignite fill-ignite" : "text-white/20")}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-white/40">
        {avg > 0 ? avg.toFixed(1) : "—"} ({count})
      </span>
    </div>
  );
}
