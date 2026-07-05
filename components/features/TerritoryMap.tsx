"use client";

import { useEffect, useState } from "react";
import { Swords, X, ShieldAlert, Loader2, Crown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

type Zone = {
  id: string;
  name: string;
  description: string;
  color: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  territory: {
    ownerId: string | null;
    ownerName: string | null;
    ownerAvatarUrl: string | null;
    clanColor: string | null;
    clanName: string | null;
    weeklyCalorieScore: number;
  } | null;
};

type IncomingAttack = {
  id: string;
  zoneName: string;
  attackerName: string;
  attackerAvatarUrl: string;
  attackerScore: number;
  defenderScore: number;
};

export function TerritoryMap({ currentUserId }: { currentUserId: string }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [incoming, setIncoming] = useState<IncomingAttack[]>([]);
  const [showIncoming, setShowIncoming] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [zonesRes, incomingRes] = await Promise.all([fetch("/api/zones"), fetch("/api/attacks/incoming")]);
    if (zonesRes.ok) setZones((await zonesRes.json()).zones);
    if (incomingRes.ok) setIncoming((await incomingRes.json()).attacks);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function challenge(zone: Zone) {
    setChallenging(true);
    setMessage(null);
    try {
      const res = await fetch("/api/attacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId: zone.id, type: "STAT" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error);
        return;
      }
      setMessage(
        data.status === "RESOLVED" ? "Your stats dominate — zone claimed automatically!" : "Challenge sent. Awaiting response.",
      );
      await refresh();
      setSelected(null);
    } finally {
      setChallenging(false);
    }
  }

  async function respond(attackId: string, action: "ACCEPT" | "FORFEIT") {
    await fetch(`/api/attacks/${attackId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display italic font-bold text-3xl">Territory</h1>
        {incoming.length > 0 && (
          <button
            onClick={() => setShowIncoming(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-ignite/15 text-ignite border border-ignite/30 px-3 py-1.5 rounded-full animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> {incoming.length} zone{incoming.length > 1 ? "s" : ""} under attack
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 text-sm bg-momentum/10 border border-momentum/30 text-momentum rounded-xl px-4 py-2.5">
          {message}
        </div>
      )}

      {loading ? (
        <div className="aspect-square w-full rounded-2xl skeleton" />
      ) : (
        <div className="relative w-full aspect-square rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#383334" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            {zones.map((zone) => {
              const isMine = zone.territory?.ownerId === currentUserId;
              const fill = zone.territory ? zone.territory.clanColor ?? zone.color : "#4a4548";
              return (
                <g key={zone.id} onClick={() => setSelected(zone)} className="cursor-pointer">
                  <rect
                    x={zone.gridX}
                    y={zone.gridY}
                    width={zone.gridW}
                    height={zone.gridH}
                    rx={2}
                    fill={fill}
                    fillOpacity={zone.territory ? 0.35 : 0.12}
                    stroke={isMine ? "#AE93F4" : fill}
                    strokeWidth={isMine ? 1.2 : 0.5}
                    strokeDasharray={zone.territory ? undefined : "2,1.5"}
                  />
                  <text
                    x={zone.gridX + zone.gridW / 2}
                    y={zone.gridY + zone.gridH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="2.6"
                    fill="#f5f3f6"
                    fontWeight={600}
                  >
                    {zone.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <LegendDot color="#AE93F4" label="Your zones" />
        <LegendDot color="#6b6568" label="Claimed" />
        <LegendDot color="#4a4548" dashed label="Unclaimed" />
      </div>

      {/* Zone detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border border-border-ichor rounded-t-3xl sm:rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">{selected.name}</h2>
              <button onClick={() => setSelected(null)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <p className="text-sm text-white/50 mb-4">{selected.description}</p>

            {!selected.territory ? (
              <div className="text-sm text-white/60 bg-white/5 rounded-xl p-3">
                Unclaimed. Post a workout tagged here to claim it.
              </div>
            ) : selected.territory.ownerId === currentUserId ? (
              <div className="flex items-center gap-3 bg-momentum/10 border border-momentum/30 rounded-xl p-3">
                <Crown className="w-5 h-5 text-momentum" />
                <div>
                  <div className="text-sm font-semibold">You hold this zone</div>
                  <div className="text-xs text-white/50">Weekly score: {selected.territory.weeklyCalorieScore}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar src={selected.territory.ownerAvatarUrl ?? undefined} name={selected.territory.ownerName ?? "?"} size={36} />
                  <div>
                    <div className="text-sm font-semibold">{selected.territory.ownerName}</div>
                    <div className="text-xs text-white/50">
                      Weekly score: {selected.territory.weeklyCalorieScore}
                      {selected.territory.clanName && ` · ${selected.territory.clanName}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => challenge(selected)}
                  disabled={challenging}
                  className="w-full inline-flex items-center justify-center gap-2 bg-ignite text-midnight font-semibold py-3 rounded-full disabled:opacity-50"
                >
                  {challenging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
                  Challenge for this zone
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Incoming attacks sheet */}
      {showIncoming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowIncoming(false)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border border-border-ichor rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Incoming challenges</h2>
              <button onClick={() => setShowIncoming(false)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <div className="space-y-3">
              {incoming.map((a) => (
                <div key={a.id} className="border border-border-ichor rounded-xl p-3.5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar src={a.attackerAvatarUrl} name={a.attackerName} size={28} />
                    <div className="text-sm">
                      <span className="font-semibold">{a.attackerName}</span> is challenging{" "}
                      <span className="font-semibold">{a.zoneName}</span>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 mb-3">
                    Their score {a.attackerScore} vs your {a.defenderScore}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => respond(a.id, "ACCEPT")}
                      className="flex-1 text-xs font-semibold bg-white/10 py-2 rounded-full"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(a.id, "FORFEIT")}
                      className="flex-1 text-xs font-semibold bg-ignite/15 text-ignite py-2 rounded-full"
                    >
                      Forfeit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn("w-2.5 h-2.5 rounded-sm inline-block")}
        style={{ backgroundColor: color, border: dashed ? "1px dashed #6b6568" : undefined }}
      />
      {label}
    </div>
  );
}
