"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Unlink } from "lucide-react";

export function StravaConnectButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <p className="text-xs text-white/40">New runs will sync in automatically from now on.</p>
      {error && <p className="text-xs text-ignite">{error}</p>}
    </div>
  );
}
