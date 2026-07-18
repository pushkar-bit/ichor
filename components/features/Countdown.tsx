"use client";

import { useEffect, useState } from "react";

/**
 * Split into its own file (not exported alongside BattleSheets' components) on purpose: it
 * used to live in BattleSheets.tsx and get imported into unrelated trees (TerritoryMap,
 * ForYouRail, the territory demo page). A component file with mixed component+type exports
 * that's pulled into multiple otherwise-unrelated render trees is exactly what breaks Next's
 * Fast Refresh isolation — any edit to that shared file (or its importers) fell back to a
 * full browser reload instead of a hot patch, which is what caused the feed's reload/flicker
 * loop. A single-purpose leaf component avoids that boundary entirely.
 */

/** Ticks once a second so every deadline in view stays live. */
function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatRemaining(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** A live-ticking countdown to a deadline; turns urgent under an hour, "expired" when past. */
export function Countdown({
  to,
  prefix = "",
  suffix = " left",
  expiredText = "expired",
  className = "",
}: {
  to: string | null;
  prefix?: string;
  suffix?: string;
  expiredText?: string;
  className?: string;
}) {
  const now = useNow();
  if (!to) return null;
  const ms = new Date(to).getTime() - now;
  const urgent = ms > 0 && ms < 3600_000;
  return (
    <span className={`tabular-nums ${urgent ? "text-ignite font-semibold" : ""} ${className}`}>
      {ms <= 0 ? expiredText : `${prefix}${formatRemaining(ms)}${suffix}`}
    </span>
  );
}
