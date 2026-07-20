"use client";

import dynamic from "next/dynamic";
import { Crown, Flame, Users, MapPin, Footprints } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { clanLevel } from "@/lib/leveling";
import { ClanActions } from "./ClanActions";
import type { MapTerritory } from "./TerritoryMap";

const TerritoryOnlyMap = dynamic(() => import("./TerritoryOnlyMap").then((m) => m.TerritoryOnlyMap), {
  ssr: false,
  loading: () => <div className="w-full h-full skeleton" />,
});

type EmpireMember = { userId: string; name: string; avatarUrl: string | null; role: string; weeklyScore: number };

export function EmpireView({
  clan,
  members,
  territories,
  zonesHeld,
  collectiveKm,
  collectivePoints,
  myUserId,
  isLeader,
}: {
  clan: { id: string; name: string; tag: string; color: string };
  members: EmpireMember[];
  territories: MapTerritory[];
  zonesHeld: number;
  collectiveKm: number;
  collectivePoints: number;
  myUserId: string;
  isLeader: boolean;
}) {
  const tier = clanLevel({ zonesHeld, memberCount: members.length });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display italic font-bold text-3xl">Empire</h1>
          <p className="text-xs text-white/40 mt-0.5">Every clanmate&apos;s land, one collective map.</p>
        </div>
        <ClanActions clanId={clan.id} isMember={true} isLeader={isLeader} hasOwnClan={true} />
      </div>

      <div className="rounded-2xl overflow-hidden border border-border-ichor mb-6">
        <div className="h-16" style={{ backgroundColor: clan.color }} />
        <div className="bg-midnight-raised p-5 flex items-center gap-3">
          <LevelBadge tier={tier} kind="clan" size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg truncate">{clan.name}</h2>
              <span className="text-xs font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded">{clan.tag}</span>
            </div>
            <p className="text-xs text-white/40">
              {tier.label} · Level {tier.level}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <div className="bg-midnight-raised border border-border-ichor rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5 inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> Members
          </div>
          <div className="text-lg font-bold">{members.length}/10</div>
        </div>
        <div className="bg-midnight-raised border border-border-ichor rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Zones held
          </div>
          <div className="text-lg font-bold">{zonesHeld}</div>
        </div>
        <div className="bg-midnight-raised border border-border-ichor rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5 inline-flex items-center gap-1">
            <Footprints className="w-3 h-3" /> Collective km
          </div>
          <div className="text-lg font-bold">{collectiveKm.toFixed(1)}</div>
        </div>
        <div className="bg-midnight-raised border border-border-ichor rounded-xl p-3">
          <div className="text-[11px] uppercase tracking-wide text-white/40 mb-0.5 inline-flex items-center gap-1">
            <Flame className="w-3 h-3 text-ignite" /> Collective pts
          </div>
          <div className="text-lg font-bold">{collectivePoints}</div>
        </div>
      </div>

      {territories.length === 0 ? (
        <div className="aspect-square w-full rounded-2xl border border-border-ichor bg-midnight-raised flex flex-col items-center justify-center gap-3 text-center px-8 mb-6">
          <Footprints className="w-8 h-8 text-white/20" />
          <p className="text-sm text-white/50">No land held yet — go run somewhere new to grow the empire.</p>
        </div>
      ) : (
        <div className="relative w-full aspect-square rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden mb-6">
          <TerritoryOnlyMap territories={territories} onTerritoryClick={() => {}} colorFor={() => clan.color} />
        </div>
      )}
      <p className="text-xs text-white/40 mb-6">
        Every kilometer run through any of this land — anyone&apos;s claim run, anyone&apos;s defense — adds to the
        empire&apos;s collective points, at the same rate a solo run earns.
      </p>

      <h2 className="font-semibold text-sm text-white/60 mb-3">Members</h2>
      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-2.5"
          >
            <Avatar src={m.avatarUrl} name={m.name} size={32} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">
                  {m.userId === myUserId ? "You" : m.name}
                </span>
                {m.role === "LEADER" && <Crown className="w-3.5 h-3.5 text-lime" />}
              </div>
              <span className="text-xs text-white/40">{m.weeklyScore} pts this week</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
