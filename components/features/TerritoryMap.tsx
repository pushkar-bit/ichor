"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Swords, X, ShieldAlert, Loader2, Crown, Shield, Users, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const LeafletZoneMap = dynamic(
  () => import("./LeafletZoneMap").then((mod) => mod.LeafletZoneMap),
  { ssr: false, loading: () => <div className="w-full h-full skeleton" /> },
);

export type Zone = {
  id: string;
  name: string;
  description: string;
  color: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  territory: {
    ownerId: string | null;
    ownerName: string | null;
    ownerAvatarUrl: string | null;
    clanColor: string | null;
    clanName: string | null;
    weeklyCalorieScore: number;
  } | null;
};

type GroupRunSummary = { id: string; sessionCode: string; startAt: string; windowEnd: string };

type IncomingAttack = {
  id: string;
  zoneName: string;
  attackerName: string;
  attackerAvatarUrl: string;
  attackerScore: number;
  defenderScore: number;
  status: "PENDING" | "WAR";
  groupRun: GroupRunSummary | null;
};

type OutgoingAttack = {
  id: string;
  zoneName: string;
  defenderName: string;
  defenderAvatarUrl: string;
  attackerScore: number;
  defenderScore: number;
  status: "PENDING" | "WAR";
  groupRun: GroupRunSummary | null;
};

type FamousTerritory = {
  zoneId: string;
  zoneName: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  clanName: string | null;
  clanColor: string | null;
  fameScore: number;
  distinctRunners: number;
  totalVisits: number;
};

export function TerritoryMap({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [incoming, setIncoming] = useState<IncomingAttack[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingAttack[]>([]);
  const [famous, setFamous] = useState<FamousTerritory[]>([]);
  const [showIncoming, setShowIncoming] = useState(false);
  const [challenging, setChallenging] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [zonesRes, incomingRes, outgoingRes, fameRes] = await Promise.all([
      fetch("/api/zones"),
      fetch("/api/attacks/incoming"),
      fetch("/api/attacks/outgoing"),
      fetch("/api/territory/fame"),
    ]);
    if (zonesRes.ok) setZones((await zonesRes.json()).zones);
    if (incomingRes.ok) setIncoming((await incomingRes.json()).attacks);
    if (outgoingRes.ok) setOutgoing((await outgoingRes.json()).attacks);
    if (fameRes.ok) setFamous((await fameRes.json()).territories);
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

  async function respond(attackId: string, action: "DEFEND" | "WAR" | "FORFEIT") {
    setResponding(attackId);
    try {
      const res = await fetch(`/api/attacks/${attackId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (action === "WAR" && res.ok && data.groupRunId) {
        router.push(`/group-run/${data.groupRunId}`);
        return;
      }
      await refresh();
    } finally {
      setResponding(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display italic font-bold text-3xl">Territory</h1>
        {incoming.length + outgoing.length > 0 && (
          <button
            onClick={() => setShowIncoming(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-ignite/15 text-ignite border border-ignite/30 px-3 py-1.5 rounded-full animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> {incoming.length + outgoing.length} active battle
            {incoming.length + outgoing.length > 1 ? "s" : ""}
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
          <LeafletZoneMap zones={zones} currentUserId={currentUserId} onZoneClick={setSelected} />
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <LegendDot color="#AE93F4" label="Your zones" />
        <LegendDot color="#6b6568" label="Claimed" />
        <LegendDot color="#4a4548" dashed label="Unclaimed" />
      </div>

      {famous.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-4 h-4 text-ignite" />
            <h2 className="font-semibold text-sm text-white/60">Most Famous Territories</h2>
          </div>
          <div className="space-y-2">
            {famous.slice(0, 8).map((t, i) => (
              <div key={t.zoneId} className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5">
                <span className="text-sm font-bold text-white/40 w-4 shrink-0">{i + 1}</span>
                {t.ownerAvatarUrl || t.ownerName ? (
                  <Avatar src={t.ownerAvatarUrl} name={t.ownerName ?? "?"} size={32} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <Flame className="w-3.5 h-3.5 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.zoneName}</div>
                  <div className="text-xs text-white/40">
                    {t.ownerName ? `Held by ${t.ownerName}` : "Unclaimed"}
                    {t.clanName && ` · ${t.clanName}`} · {t.distinctRunners} runner{t.distinctRunners === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-ignite shrink-0">
                  <Flame className="w-3 h-3" /> {t.fameScore}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Battles sheet — incoming (defender) and outgoing (attacker) challenges */}
      {showIncoming && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowIncoming(false)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border border-border-ichor rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Active battles</h2>
              <button onClick={() => setShowIncoming(false)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {incoming.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Defending</h3>
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
                      {a.status === "WAR" && a.groupRun ? (
                        <button
                          onClick={() => router.push(`/group-run/${a.groupRun!.id}`)}
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-white/10 py-2 rounded-full"
                        >
                          <Users className="w-3.5 h-3.5" /> View war lobby
                        </button>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => respond(a.id, "DEFEND")}
                            disabled={responding === a.id}
                            className="text-xs font-semibold bg-white/10 py-2 rounded-full disabled:opacity-50"
                          >
                            Defend
                          </button>
                          <button
                            onClick={() => respond(a.id, "WAR")}
                            disabled={responding === a.id}
                            className="inline-flex items-center justify-center gap-1 text-xs font-semibold bg-momentum/20 text-momentum py-2 rounded-full disabled:opacity-50"
                          >
                            <Shield className="w-3 h-3" /> War
                          </button>
                          <button
                            onClick={() => respond(a.id, "FORFEIT")}
                            disabled={responding === a.id}
                            className="text-xs font-semibold bg-ignite/15 text-ignite py-2 rounded-full disabled:opacity-50"
                          >
                            Forfeit
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outgoing.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Attacking</h3>
                <div className="space-y-3">
                  {outgoing.map((a) => (
                    <div key={a.id} className="border border-border-ichor rounded-xl p-3.5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <Avatar src={a.defenderAvatarUrl} name={a.defenderName} size={28} />
                        <div className="text-sm">
                          Challenging <span className="font-semibold">{a.defenderName}</span> for{" "}
                          <span className="font-semibold">{a.zoneName}</span>
                        </div>
                      </div>
                      <div className="text-xs text-white/50 mb-3">
                        Your score {a.attackerScore} vs their {a.defenderScore}
                      </div>
                      {a.status === "WAR" && a.groupRun ? (
                        <button
                          onClick={() => router.push(`/group-run/${a.groupRun!.id}`)}
                          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-momentum text-midnight py-2 rounded-full"
                        >
                          <Swords className="w-3.5 h-3.5" /> Join the war
                        </button>
                      ) : (
                        <p className="text-xs text-white/40">Awaiting their response...</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
