"use client";

import { useEffect, useState } from "react";
import { X, Swords, MapPin, Loader2, Timer, Footprints } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type TerritoryResult = {
  eligible: boolean;
  attackWindowOpen: boolean;
  claimed: { territoryId: string; name: string; areaSqM: number; valuePoints: number } | null;
  opportunities: {
    territoryId: string;
    territoryName: string;
    ownerName: string | null;
    ownerAvatarUrl: string | null;
    coverage: number;
  }[];
};

/**
 * Post-run prompt: what the run claimed, and which territories it can attack. Attacking
 * is always an explicit choice — this sheet is the only place an attack starts.
 */
export function AttackPromptSheet({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const [result, setResult] = useState<TerritoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"PACE" | "DISTANCE">("PACE");
  const [attacking, setAttacking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/workouts/${workoutId}/territory-result`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setResult)
      .finally(() => setLoading(false));
  }, [workoutId]);

  async function attack(territoryId: string) {
    setAttacking(territoryId);
    setError(null);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutId, territoryId, proposedMetric: metric }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMessage("Attack sent. The owner has 48h to respond — you'll get a notification.");
      setResult((prev) =>
        prev ? { ...prev, opportunities: prev.opportunities.filter((o) => o.territoryId !== territoryId) } : prev,
      );
    } finally {
      setAttacking(null);
    }
  }

  const hasAnything = result?.claimed || (result?.opportunities.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Territory report</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/30" />
          </div>
        ) : !result?.eligible ? (
          <p className="text-sm text-white/50">This workout has no GPS route, so it can&apos;t claim or attack land.</p>
        ) : !hasAnything ? (
          <p className="text-sm text-white/50">No new ground claimed and no attack opportunities from this run.</p>
        ) : (
          <div className="space-y-4">
            {result.claimed && (
              <div className="flex items-center gap-3 bg-momentum/10 border border-momentum/30 rounded-xl p-3">
                <MapPin className="w-5 h-5 text-momentum shrink-0" />
                <div>
                  <div className="text-sm font-semibold">You claimed {result.claimed.name}</div>
                  <div className="text-xs text-white/50">
                    {Math.round(result.claimed.areaSqM / 1000)}k m² · worth {result.claimed.valuePoints} pts
                  </div>
                </div>
              </div>
            )}

            {result.opportunities.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                  Attack opportunities
                </div>

                {!result.attackWindowOpen ? (
                  <p className="text-xs text-white/40 bg-white/5 rounded-xl p-3">
                    This run is older than 24h — attacks need a fresh run through the territory.
                  </p>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="text-xs text-white/50 block mb-1.5">Propose the battle metric</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["PACE", "DISTANCE"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMetric(m)}
                            className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-none border-2 ${
                              metric === m ? "border-momentum bg-momentum/15 text-momentum" : "border-border-ichor text-white/60"
                            }`}
                          >
                            {m === "PACE" ? <Timer className="w-3.5 h-3.5" /> : <Footprints className="w-3.5 h-3.5" />}
                            {m === "PACE" ? "Pace" : "Distance"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {result.opportunities.map((o) => (
                        <div key={o.territoryId} className="border-2 border-border-ichor rounded-none p-3">
                          <div className="flex items-center gap-2.5 mb-2">
                            <Avatar src={o.ownerAvatarUrl ?? undefined} name={o.ownerName ?? "?"} size={28} />
                            <div className="text-sm flex-1 min-w-0">
                              <span className="font-semibold">{o.territoryName}</span>
                              <div className="text-xs text-white/50">
                                Held by {o.ownerName ?? "another athlete"} · you covered {Math.round(o.coverage * 100)}%
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => attack(o.territoryId)}
                            disabled={attacking === o.territoryId}
                            className="w-full inline-flex items-center justify-center gap-2 bg-ignite text-midnight text-sm font-semibold py-2 rounded-none disabled:opacity-50"
                          >
                            {attacking === o.territoryId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                            Attack
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {message && <p className="text-sm text-momentum bg-momentum/10 border border-momentum/30 rounded-xl p-3">{message}</p>}
            {error && <p className="text-sm text-ignite">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
