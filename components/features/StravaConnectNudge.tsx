"use client";

import { useEffect, useState } from "react";
import { Link2, X } from "lucide-react";

const DISMISS_KEY = "ichor.stravaNudgeDismissedAt";
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // reappears about a week after being dismissed

// The recurring "connect Strava" reminder for anyone without it linked — account-level status,
// not tied to any one feed tab, so it renders once above the tabs regardless of which is active
// (see FeedClient.tsx). Uses localStorage rather than the sessionStorage pattern ForYouRail uses
// for its own dismissals: this needs to survive a browser restart so the cooldown actually
// spans days, not just the current tab session.
export function StravaConnectNudge({ connected }: { connected: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (connected) return;
    try {
      const last = localStorage.getItem(DISMISS_KEY);
      if (!last || Date.now() - Number(last) > REMIND_AFTER_MS) setVisible(true);
    } catch {
      setVisible(true); // no localStorage available (e.g. private mode) — just show it
    }
  }, [connected]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — dismissal just won't persist across sessions, which is fine */
    }
  }

  if (!visible) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-border-ichor bg-midnight-raised px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-[#FC4C02]/15 flex items-center justify-center shrink-0">
        <Link2 className="w-4 h-4 text-[#FC4C02]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Auto-sync your runs</p>
        <p className="text-xs text-white/50">Connect Strava and every run posts here automatically.</p>
      </div>
      <a
        href="/api/integrations/strava/connect"
        className="shrink-0 text-xs font-bold bg-[#FC4C02] text-white px-3 py-2 rounded-full"
      >
        Connect
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-white/30 hover:text-white/60"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
