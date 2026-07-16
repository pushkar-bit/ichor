"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Unlink, RefreshCw } from "lucide-react";

export function StravaConnectButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/strava/disconnect", { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        setError("Couldn't disconnect. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/integrations/strava/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(data.synced > 0 ? `Synced ${data.synced} new run${data.synced === 1 ? "" : "s"}.` : "You're all caught up.");
        if (data.synced > 0) router.refresh();
      } else {
        setError(data.error ?? "Sync failed. Try again.");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSyncing(false);
    }
  }

  if (!connected) {
    return (
      <a
        href="/api/integrations/strava/connect"
        className="flex items-center justify-center gap-2 border border-border-ichor hover:bg-white/5 transition-colors rounded-xl py-3 text-white font-medium text-sm"
      >
        <Link2 className="w-4 h-4 text-[#FC4C02]" />
        Connect Strava
      </a>
    );
  }

  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="w-4 h-4 text-[#FC4C02]" />
          Strava connected
        </div>
        <button
          onClick={disconnect}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-white/70 hover:text-ignite rounded-full px-3 py-1.5 disabled:opacity-50"
        >
          <Unlink className="w-3.5 h-3.5" />
          Disconnect
        </button>
      </div>
      <button
        onClick={syncNow}
        disabled={syncing}
        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 transition-colors text-white text-sm font-semibold rounded-xl py-2.5 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing…" : "Sync recent runs"}
      </button>
      <p className="text-xs text-white/40">
        New runs sync automatically, but tap Sync to pull anything that hasn&apos;t come through yet.
      </p>
      {syncMsg && <p className="text-xs text-momentum">{syncMsg}</p>}
      {error && <p className="text-xs text-ignite">{error}</p>}
    </div>
  );
}
