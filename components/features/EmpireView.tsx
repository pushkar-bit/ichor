"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Crown, Trophy, MapPin, Footprints, Flame, Swords, Loader2, CheckCircle2, Circle, X, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { clanLevel } from "@/lib/leveling";
import { ClanActions } from "./ClanActions";
import type { MapTerritory } from "./TerritoryMap";

const TerritoryOnlyMap = dynamic(() => import("./TerritoryOnlyMap").then((m) => m.TerritoryOnlyMap), {
  ssr: false,
  loading: () => <div className="w-full h-full skeleton" />,
});

type EmpireMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  weeklyScore: number;
  weeklyKmOnClanLand: number;
  territoriesOwned: number;
  dietCleanThisWeek: boolean;
};

type ClanWar = {
  id: string;
  status: "ACTIVE" | "RESOLVED";
  startedAt: string;
  endsAt: string;
  clanA: { id: string; name: string; tag: string; color: string; km: number };
  clanB: { id: string; name: string; tag: string; color: string; km: number };
  winnerId: string | null;
};

function timeLeft(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "resolving…";
  const hours = Math.floor(ms / 3600_000);
  const mins = Math.floor((ms % 3600_000) / 60_000);
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

export function EmpireView({
  clan,
  members,
  territories,
  zonesHeld,
  collectiveKm,
  collectivePoints,
  wars,
  myUserId,
  isLeader,
}: {
  clan: { id: string; name: string; tag: string; color: string; dietPactDescription: string; battlesWon: number };
  members: EmpireMember[];
  territories: MapTerritory[];
  zonesHeld: number;
  collectiveKm: number;
  collectivePoints: number;
  wars: ClanWar[];
  myUserId: string;
  isLeader: boolean;
}) {
  const router = useRouter();
  const tier = clanLevel({ totalKm: collectiveKm, territoriesHeld: zonesHeld });
  const weeklyScoreSum = members.reduce((s, m) => s + m.weeklyScore, 0);
  const activeWars = wars.filter((w) => w.status === "ACTIVE");
  const pastWars = wars.filter((w) => w.status === "RESOLVED");

  const [declaring, setDeclaring] = useState(false);
  const [warQuery, setWarQuery] = useState("");
  const [warResults, setWarResults] = useState<{ id: string; name: string; tag: string; color: string }[]>([]);
  const [warSearching, setWarSearching] = useState(false);
  const [warError, setWarError] = useState<string | null>(null);
  const [warSubmitting, setWarSubmitting] = useState<string | null>(null);

  async function searchEnemyClans(q: string) {
    setWarQuery(q);
    if (!q.trim()) return setWarResults([]);
    setWarSearching(true);
    try {
      const res = await fetch(`/api/clans/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setWarResults((data.clans ?? []).filter((c: { id: string }) => c.id !== clan.id));
    } finally {
      setWarSearching(false);
    }
  }

  async function declareWar(enemyClanId: string) {
    setWarSubmitting(enemyClanId);
    setWarError(null);
    try {
      const res = await fetch(`/api/clans/${clan.id}/war`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enemyClanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWarError(data.error);
        return;
      }
      setDeclaring(false);
      router.refresh();
    } finally {
      setWarSubmitting(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display italic font-bold text-3xl">Empire</h1>
          <p className="text-xs text-white/40 mt-0.5">Every clanmate&apos;s land, one collective map.</p>
        </div>
        <ClanActions clanId={clan.id} isMember={true} isLeader={isLeader} hasOwnClan={true} />
      </div>

      {/* Header: full-width clan-color banner, level badge, name/tag */}
      <div className="rounded-2xl overflow-hidden border border-border-ichor mb-6">
        <div
          className="relative"
          style={{
            height: 120,
            background: `linear-gradient(180deg, ${clan.color} 0%, rgba(0,0,0,0.6) 100%)`,
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h2 className="font-display italic font-bold text-white text-3xl tracking-wide" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
              {clan.tag}
            </h2>
            <p className="text-white/90 font-medium">{clan.name}</p>
          </div>
        </div>
        <div className="bg-midnight-raised p-5 flex items-center gap-3">
          <LevelBadge tier={tier} isOwnedByClan clanColor={clan.color} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-light text-white/60">
              Level {tier.level} — {tier.name}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <StatCard icon={<Footprints className="w-3 h-3" />} label="Total Clan KM" value={collectiveKm.toFixed(1)} />
        <StatCard icon={<MapPin className="w-3 h-3" />} label="Territories Held" value={String(zonesHeld)} />
        <StatCard icon={<Trophy className="w-3 h-3" />} label="Weekly Score" value={String(weeklyScoreSum)} />
        <StatCard icon={<Swords className="w-3 h-3" />} label="Battles Won" value={String(clan.battlesWon)} />
      </div>

      {/* Collective territory map */}
      {territories.length === 0 ? (
        <div className="aspect-square w-full rounded-2xl border border-border-ichor bg-midnight-raised flex flex-col items-center justify-center gap-3 text-center px-8 mb-3">
          <Footprints className="w-8 h-8 text-white/20" />
          <p className="text-sm text-white/50">No land held yet — go run somewhere new to grow the empire.</p>
        </div>
      ) : (
        <div className="relative w-full rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden mb-3" style={{ height: 300 }}>
          <TerritoryOnlyMap territories={territories} onTerritoryClick={() => {}} colorFor={() => clan.color} />
        </div>
      )}
      <p className="text-xs text-white/40 mb-6">
        Every kilometer run through any of this land — anyone&apos;s claim run, anyone&apos;s defense — adds{" "}
        <b className="text-white/60">{collectivePoints} collective points</b> so far, at the same rate a solo run earns.
      </p>

      {/* Diet pact */}
      {clan.dietPactDescription && (
        <div className="rounded-xl p-4 mb-6 bg-midnight-raised border-l-4" style={{ borderLeftColor: clan.color }}>
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: clan.color }}>
            This week&apos;s pact
          </div>
          <p className="text-sm text-white/80 mb-3">{clan.dietPactDescription}</p>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-1.5" title={m.dietCleanThisWeek ? "Logged clean this week" : "Hasn't logged yet"}>
                <div className="relative">
                  <Avatar src={m.avatarUrl} name={m.name} size={28} />
                  {m.dietCleanThisWeek ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime absolute -bottom-0.5 -right-0.5 bg-midnight-raised rounded-full" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-white/20 absolute -bottom-0.5 -right-0.5 bg-midnight-raised rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <h2 className="font-semibold text-sm text-white/60 mb-3">Members</h2>
      <div className="space-y-2 mb-6">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5"
          >
            <Avatar src={m.avatarUrl} name={m.name} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{m.userId === myUserId ? "You" : m.name}</span>
                {m.role === "LEADER" && <Crown className="w-3.5 h-3.5 text-lime" />}
              </div>
              <span className="text-xs text-white/40">
                {m.weeklyKmOnClanLand.toFixed(1)} km on clan land this week · {m.territoriesOwned} zone
                {m.territoriesOwned === 1 ? "" : "s"} owned
              </span>
            </div>
            <span className="text-xs font-semibold text-white/50 shrink-0">{m.weeklyScore} pts</span>
          </div>
        ))}
      </div>

      {/* Clan wars */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-white/60">Clan Wars</h2>
        {isLeader && (
          <button
            onClick={() => setDeclaring(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-ignite/15 text-ignite border border-ignite/30 px-3 py-1.5 rounded-full"
          >
            <Swords className="w-3.5 h-3.5" /> Declare War
          </button>
        )}
      </div>

      {activeWars.length === 0 && pastWars.length === 0 ? (
        <p className="text-sm text-white/30 mb-6">No wars yet — declare one to race another clan for 48 hours.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {[...activeWars, ...pastWars].map((w) => {
            const isA = w.clanA.id === clan.id;
            const us = isA ? w.clanA : w.clanB;
            const them = isA ? w.clanB : w.clanA;
            const won = w.winnerId === clan.id;
            const lost = w.winnerId !== null && w.winnerId !== clan.id;
            return (
              <div key={w.id} className="bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">
                    vs {them.name} <span className="text-white/40">({them.tag})</span>
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      w.status === "ACTIVE" ? "text-momentum" : won ? "text-lime" : lost ? "text-ignite" : "text-white/40"
                    }`}
                  >
                    {w.status === "ACTIVE" ? timeLeft(w.endsAt) : won ? "Won" : lost ? "Lost" : "Tied"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Flame className="w-3 h-3" /> {us.km.toFixed(1)} km vs {them.km.toFixed(1)} km
                </div>
              </div>
            );
          })}
        </div>
      )}

      {declaring && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setDeclaring(false)}>
          <div
            className="w-full sm:max-w-sm bg-midnight-raised border border-border-ichor rounded-t-3xl sm:rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Declare war</h2>
              <button onClick={() => setDeclaring(false)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={warQuery}
                onChange={(e) => searchEnemyClans(e.target.value)}
                placeholder="Search by name or tag..."
                className="w-full bg-midnight border border-border-ichor rounded-full pl-10 pr-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-ignite/50"
              />
            </div>
            {warError && <p className="text-sm text-ignite mb-2">{warError}</p>}
            {warSearching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {warResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => declareWar(c.id)}
                    disabled={warSubmitting === c.id}
                    className="w-full flex items-center gap-3 bg-midnight border border-border-ichor rounded-xl px-3 py-2.5 disabled:opacity-50"
                  >
                    <span className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: c.color }} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-white/40">{c.tag}</div>
                    </div>
                    {warSubmitting === c.id && <Loader2 className="w-4 h-4 animate-spin text-ignite" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-midnight-raised border-t-2 border-t-momentum border-x border-b border-border-ichor rounded-xl p-3">
      <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5 inline-flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
