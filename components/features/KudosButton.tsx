"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function KudosButton({
  postId,
  initialCount,
  initialGiven,
}: {
  postId: string;
  initialCount: number;
  initialGiven: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [given, setGiven] = useState(initialGiven);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !given;
    setGiven(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${postId}/kudos`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCount(data.kudosCount);
        setGiven(data.given);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors",
        given ? "bg-momentum/15 border-momentum/40 text-momentum" : "border-border-ichor text-white/50 hover:text-white",
      )}
    >
      <Zap className={cn("w-3.5 h-3.5", given && "fill-momentum")} />
      Kudos {count > 0 ? count : ""}
    </button>
  );
}
