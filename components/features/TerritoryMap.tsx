"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { X, Crown, Flame, EyeOff, Footprints, Map, Grid3x3, Shield, ShieldAlert, Swords, Timer, Hourglass, Info, HelpCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { territoryLevel } from "@/lib/leveling";
import { formatPace, formatDuration, timeAgo } from "@/lib/utils";
import { BattleRespondSheet, BattleRevealCard, type BattleListItem } from "./BattleSheets";
import { Countdown } from "./Countdown";

const LeafletTerritoryMap = dynamic(
  () => import("./LeafletTerritoryMap").then((mod) => mod.LeafletTerritoryMap),
  { ssr: false, loading: () => <div className="w-full h-full skeleton" /> },
);
const TerritoryOnlyMap = dynamic(
  () => import("./TerritoryOnlyMap").then((mod) => mod.TerritoryOnlyMap),
  { ssr: false, loading: () => <div className="w-full h-full skeleton" /> },
);

type PolygonGeometry =
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "MultiPolygon"; coordinates: [number, number][][][] };

export type MapTerritory = {
  id: string;
  name: string;
  color: string;
  geometry: PolygonGeometry;
  centroid: { lat: number; lng: number };
  bbox: [number, number, number, number];
  areaSqM: number;
  valuePoints: number;
  fameScore: number;
  totalDistanceKm: number;
  shieldUntil: string | null;
  createdAt: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  isMine: boolean;
  claimStats?: {
    distanceKm: number;
    avgPaceMinPerKm: number | null;
    durationSeconds: number;
    workoutDate: string;
  };
};

type FamousTerritory = {
  territoryId: string;
  territoryName: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatarUrl: string | null;
  fameScore: number;
  distinctRunners: number;
  totalVisits: number;
  totalDistanceKm: number;
};

function formatArea(areaSqM: number): string {
  if (areaSqM >= 1_000_000) return `${(areaSqM / 1_000_000).toFixed(2)} km²`;
  return `${Math.round(areaSqM / 1000)}k m²`;
}

export function TerritoryMap({ currentUserId }: { currentUserId: string }) {
  const [territories, setTerritories] = useState<MapTerritory[]>([]);
  const [famous, setFamous] = useState<FamousTerritory[]>([]);
  const [battles, setBattles] = useState<BattleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MapTerritory | null>(null);
  const [showBattles, setShowBattles] = useState(false);
  const [responding, setResponding] = useState<BattleListItem | null>(null);
  const [revealing, setRevealing] = useState<BattleListItem | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [view, setView] = useState<"street" | "territories">("street");

  const myLand = territories.filter((t) => t.isMine);
  const myLandValue = myLand.reduce((s, t) => s + t.valuePoints, 0);
  const activeBattles = battles.filter((b) => b.status !== "RESOLVED");
  const needsMyResponse = activeBattles.filter((b) => b.status === "PENDING_RESPONSE" && b.role === "defender");
  // Territories with a live battle — the map outlines these in ignite.
  const underAttackIds = new Set(activeBattles.map((b) => b.territory?.id).filter((id): id is string => Boolean(id)));

  // Show the rules once, automatically, on a runner's first visit to the map.
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("ichor.territoryRulesSeen")) {
      setShowRules(true);
      localStorage.setItem("ichor.territoryRulesSeen", "1");
    }
  }, []);

  // Deep-link from the feed's For-You battle cards (/map?battle=<id>&sheet=respond|reveal):
  // once battles load, open the exact sheet for that battle, then clean the URL so a refresh
  // doesn't reopen it. Falls back to the battles panel if the specific sheet isn't applicable.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || battles.length === 0 || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const battleId = params.get("battle");
    if (!battleId) return;
    deepLinkHandled.current = true;
    const b = battles.find((x) => x.id === battleId);
    if (b) {
      const sheet = params.get("sheet");
      if (b.status === "RESOLVED" && (sheet === "reveal" || !sheet)) setRevealing(b);
      else if (b.status === "PENDING_RESPONSE" && b.role === "defender") setResponding(b);
      else setShowBattles(true);
    }
    window.history.replaceState(null, "", "/map");
  }, [battles]);

  async function refresh() {
    const [terrRes, battlesRes] = await Promise.all([fetch("/api/territories"), fetch("/api/battles")]);
    if (terrRes.ok) {
      const data = await terrRes.json();
      setTerritories(data.territories);
      setFamous(data.fame);
    }
    if (battlesRes.ok) {
      setBattles((await battlesRes.json()).battles);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display italic font-bold text-3xl">Territory</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            aria-label="How territory works"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-white/15 text-white/60 hover:text-white/90"
          >
            <HelpCircle className="w-3.5 h-3.5" /> How it works
          </button>
          {activeBattles.length > 0 && (
            <button
              onClick={() => setShowBattles(true)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                needsMyResponse.length > 0
                  ? "bg-ignite/15 text-ignite border-ignite/30 animate-pulse"
                  : "bg-white/5 text-white/60 border-white/15"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> {activeBattles.length} battle{activeBattles.length > 1 ? "s" : ""}
            </button>
          )}
          {myLand.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-momentum/15 text-momentum border border-momentum/30 px-3 py-1.5 rounded-full">
              <Crown className="w-3.5 h-3.5" /> {myLand.length} · {myLandValue} pts
            </span>
          )}
        </div>
      </div>

      {territories.length > 0 && !loading && (
        <div className="inline-flex rounded-full border border-border-ichor p-0.5 bg-midnight-raised mb-3">
          <button
            onClick={() => setView("street")}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              view === "street" ? "bg-momentum text-midnight" : "text-white/50"
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Street
          </button>
          <button
            onClick={() => setView("territories")}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              view === "territories" ? "bg-momentum text-midnight" : "text-white/50"
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" /> Territories
          </button>
        </div>
      )}

      {loading ? (
        <div className="aspect-square w-full rounded-2xl skeleton" />
      ) : territories.length === 0 ? (
        <div className="aspect-square w-full rounded-2xl border border-border-ichor bg-midnight-raised flex flex-col items-center justify-center gap-3 text-center px-8">
          <Footprints className="w-8 h-8 text-white/20" />
          <p className="text-sm text-white/50">
            No land has been claimed yet. Sync a GPS run — the ground you cover becomes your territory.
          </p>
        </div>
      ) : (
        <div className="relative w-full aspect-square rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden">
          {view === "street" ? (
            <LeafletTerritoryMap territories={territories} onTerritoryClick={setSelected} underAttackIds={underAttackIds} />
          ) : (
            <TerritoryOnlyMap territories={territories} onTerritoryClick={setSelected} underAttackIds={underAttackIds} />
          )}
        </div>
      )}

      {territories.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border-2 border-white bg-white/30 inline-block" /> Yours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white/20 border border-white/40 inline-block" /> Rivals
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-dashed border-white/60 inline-block" /> Shielded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border-2 border-dotted border-ignite inline-block" /> Under attack
          </span>
        </div>
      )}

      <p className="mt-2 text-xs text-white/40">
        Run somewhere nobody owns to claim it. Cover 6%+ of someone else&apos;s territory in a single run to unlock an attack.
      </p>

      {battles.filter((b) => b.status === "RESOLVED" && b.revealedStats).length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-1.5 mb-3">
            <Swords className="w-4 h-4 text-white/40" />
            <h2 className="font-semibold text-sm text-white/60">Recent battles</h2>
          </div>
          <div className="space-y-2">
            {battles
              .filter((b) => b.status === "RESOLVED" && b.revealedStats)
              .slice(0, 5)
              .map((b) => {
                const won = b.winnerId === currentUserId;
                const label =
                  b.resolution === "SPLIT" ? "Split" : b.resolution === "DOUBLE_FORFEIT" ? "Forfeit" : won ? "Won" : "Lost";
                return (
                  <button
                    key={b.id}
                    onClick={() => setRevealing(b)}
                    className="w-full flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5 text-left"
                  >
                    <Avatar src={b.opponent?.avatarUrl} name={b.opponent?.name ?? "?"} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {b.territory?.name} · vs {b.opponent?.name}
                      </div>
                      <div className="text-xs text-white/40">{timeAgo(b.createdAt)} · tap for the reveal</div>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        b.resolution === "SPLIT" ? "text-momentum" : won ? "text-lime" : "text-ignite"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {famous.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-1.5 mb-3">
            <Flame className="w-4 h-4 text-ignite" />
            <h2 className="font-semibold text-sm text-white/60">Most Famous Territories</h2>
          </div>
          <div className="space-y-2">
            {famous.slice(0, 8).map((t, i) => (
              <div key={t.territoryId} className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5">
                <span className="text-sm font-bold text-white/40 w-4 shrink-0">{i + 1}</span>
                {t.ownerAvatarUrl || t.ownerName ? (
                  <Avatar src={t.ownerAvatarUrl} name={t.ownerName ?? "?"} size={32} />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <Flame className="w-3.5 h-3.5 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.territoryName}</div>
                  <div className="text-xs text-white/40">
                    {t.ownerName ? `Held by ${t.ownerName}` : "Unclaimed"} · {t.distinctRunners} runner
                    {t.distinctRunners === 1 ? "" : "s"} · {t.totalDistanceKm.toFixed(1)}km covered
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

      {/* Territory detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border border-border-ichor rounded-t-3xl sm:rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LevelBadge tier={territoryLevel(selected)} size={26} />
                <h2 className="font-semibold text-lg">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Avatar src={selected.ownerAvatarUrl ?? undefined} name={selected.ownerName ?? "?"} size={36} />
              <div>
                <div className="text-sm font-semibold">
                  {selected.isMine ? "You hold this land" : selected.ownerName ?? "Unknown athlete"}
                </div>
                <div className="text-xs text-white/50">
                  Claimed {timeAgo(selected.createdAt)} · {formatArea(selected.areaSqM)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5">Value</div>
                <div className="text-sm font-bold">{selected.valuePoints} pts</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5">Fame</div>
                <div className="text-sm font-bold inline-flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-ignite" /> {selected.fameScore}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5">Covered</div>
                <div className="text-sm font-bold">{selected.totalDistanceKm.toFixed(1)} km</div>
              </div>
            </div>

            {underAttackIds.has(selected.id) && (
              <div className="flex items-center gap-2 text-xs text-ignite bg-ignite/10 border border-ignite/25 rounded-xl p-3 mb-3">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                This land is in an active battle right now.
              </div>
            )}

            {selected.shieldUntil && new Date(selected.shieldUntil) > new Date() && (
              <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 rounded-xl p-3 mb-3">
                <Shield className="w-4 h-4 text-momentum shrink-0" />
                Shielded from attacks — <Countdown to={selected.shieldUntil} suffix=" left" expiredText="lifting…" />.
              </div>
            )}

            {selected.isMine && selected.claimStats ? (
              <div className="bg-momentum/10 border border-momentum/30 rounded-xl p-3">
                <div className="text-xs font-semibold text-momentum mb-1.5">Your claim run (only you see this)</div>
                <div className="text-xs text-white/60">
                  {selected.claimStats.distanceKm.toFixed(2)} km ·{" "}
                  {formatPace(selected.claimStats.avgPaceMinPerKm)} ·{" "}
                  {formatDuration(selected.claimStats.durationSeconds)}
                </div>
              </div>
            ) : !selected.isMine ? (
              <div className="flex items-start gap-2 text-xs text-white/50 bg-white/5 rounded-xl p-3">
                <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Run stats hidden — fog of war. Nobody knows what run earned this land. Cover 6%+ of it in a single
                  run to unlock an attack.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Active battles sheet */}
      {showBattles && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowBattles(false)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Active battles</h2>
              <button onClick={() => setShowBattles(false)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <div className="space-y-3">
              {activeBattles.map((b) => {
                const deadline =
                  b.status === "PENDING_RESPONSE" ? b.respondBy : b.status === "ASYNC_ACTIVE" ? b.asyncDeadline : b.duelWindowEnd;
                return (
                  <div key={b.id} className="border-2 border-border-ichor rounded-none p-3.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar src={b.opponent?.avatarUrl} name={b.opponent?.name ?? "?"} size={28} />
                      <div className="text-sm flex-1 min-w-0">
                        <span className="font-semibold">{b.territory?.name}</span>
                        <div className="text-xs text-white/50">
                          {b.role === "attacker" ? "Attacking" : "Defending against"} {b.opponent?.name}
                        </div>
                      </div>
                    </div>

                    {b.status === "PENDING_RESPONSE" && b.role === "defender" ? (
                      <button
                        onClick={() => {
                          setShowBattles(false);
                          setResponding(b);
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 bg-ignite text-midnight text-sm font-semibold py-2 rounded-none"
                      >
                        <Swords className="w-4 h-4" /> Respond
                      </button>
                    ) : b.status === "PENDING_RESPONSE" ? (
                      <p className="text-xs text-white/40 inline-flex items-center gap-1.5">
                        <Hourglass className="w-3.5 h-3.5" /> Awaiting their response ·{" "}
                        <Countdown to={deadline} suffix=" left" expiredText="resolving…" />
                      </p>
                    ) : (
                      <div className="text-xs text-white/50 space-y-1">
                        <div className="inline-flex items-center gap-1.5 flex-wrap">
                          <Timer className="w-3.5 h-3.5 shrink-0" />
                          {b.status === "ASYNC_ACTIVE" ? (
                            <span>
                              Open {b.asyncMetric?.toLowerCase()} challenge — run in the territory ·{" "}
                              <Countdown to={deadline} suffix=" left" expiredText="resolving…" />
                            </span>
                          ) : (
                            <span>
                              Duel ({b.duelMetric?.toLowerCase()}) —{" "}
                              {b.duelWindowStart && new Date(b.duelWindowStart) > new Date() ? (
                                <>opens in <Countdown to={b.duelWindowStart} prefix="" suffix="" expiredText="now" /></>
                              ) : (
                                <>window <Countdown to={b.duelWindowEnd} suffix=" left" expiredText="closed" /></>
                              )}
                            </span>
                          )}
                        </div>
                        <div>
                          You: {b.iHaveSubmitted ? "✓ ran" : "no run yet"} · Them: {b.opponentHasSubmitted ? "✓ ran (stats hidden)" : "no run yet"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {activeBattles.length === 0 && <p className="text-sm text-white/40">No active battles.</p>}
            </div>
          </div>
        </div>
      )}

      {responding && (
        <BattleRespondSheet
          battle={responding}
          currentUserId={currentUserId}
          onClose={() => setResponding(null)}
          onResponded={refresh}
        />
      )}
      {revealing && <BattleRevealCard battle={revealing} currentUserId={currentUserId} onClose={() => setRevealing(null)} />}

      {/* How it works — rules onboarding (auto-shown once, reopenable from the header) */}
      {showRules && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowRules(false)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg inline-flex items-center gap-2">
                <Info className="w-5 h-5 text-momentum" /> How territory works
              </h2>
              <button onClick={() => setShowRules(false)} aria-label="Close">
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <div className="space-y-3.5 text-sm text-white/70">
              <div className="flex gap-3">
                <Footprints className="w-5 h-5 text-momentum shrink-0 mt-0.5" />
                <p><b className="text-white">Run to claim.</b> Any GPS-verified run over 2km turns the unclaimed ground it covers into your territory — automatically, the moment it syncs.</p>
              </div>
              <div className="flex gap-3">
                <Swords className="w-5 h-5 text-ignite shrink-0 mt-0.5" />
                <p><b className="text-white">Cover 6% to attack.</b> Run at least as far as the territory&apos;s own claim distance (capped at 3km) and cover 6%+ of its land in a single run, and you can challenge its owner — on pace or on distance.</p>
              </div>
              <div className="flex gap-3">
                <EyeOff className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />
                <p><b className="text-white">Fog of war.</b> Neither side sees the other&apos;s run until the battle resolves. You attack, and defend, blind.</p>
              </div>
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-momentum shrink-0 mt-0.5" />
                <p><b className="text-white">Defenders choose.</b> Accept an open challenge (72h) or schedule a live duel — best run wins the whole territory, +100 points, and a 72h shield. Refuse, and it&apos;s decided on the spot: only a run that beats your claim carves off land; a weaker one takes nothing.</p>
              </div>
              <div className="flex gap-3">
                <Flame className="w-5 h-5 text-ignite shrink-0 mt-0.5" />
                <p><b className="text-white">Fame is separate.</b> Every run through a piece of land — anyone&apos;s — makes it more famous, whoever owns it. Famous ground climbs the leaderboard below.</p>
              </div>
            </div>
            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-5 bg-momentum text-midnight font-semibold py-3 rounded-none border-2 border-border-ichor"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
