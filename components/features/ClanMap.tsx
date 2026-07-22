"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapTerritory } from "./TerritoryMap";

const TerritoryOnlyMap = dynamic(() => import("./TerritoryOnlyMap").then((m) => m.TerritoryOnlyMap), {
  ssr: false,
  loading: () => <div className="w-full h-full skeleton" />,
});

/** Land that belongs to nobody's clan reads as neutral stone, so clan-held ground pops. */
const UNCLANNED_COLOR = "#3a3a3a";

/**
 * "Clan territories" view — same tactical-grid map as the territories-only view, but every
 * territory is colored by its owner's clan instead of by owner or level tier, with a legend
 * of the top clans by land held. Territories whose owner isn't in a clan still render, in a
 * neutral color, so the map doesn't look sparse.
 */
export function ClanMap({
  territories,
  onTerritoryClick,
}: {
  territories: MapTerritory[];
  onTerritoryClick: (territory: MapTerritory) => void;
}) {
  const topClans = useMemo(() => {
    const counts = new Map<string, { name: string; tag: string; color: string; count: number }>();
    for (const t of territories) {
      if (!t.ownerClanId) continue;
      const existing = counts.get(t.ownerClanId);
      if (existing) existing.count += 1;
      else counts.set(t.ownerClanId, { name: t.ownerClanName ?? "?", tag: t.ownerClanTag ?? "", color: t.ownerClanColor ?? "#AE93F4", count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [territories]);

  return (
    <div className="relative w-full h-full">
      <TerritoryOnlyMap
        territories={territories}
        onTerritoryClick={onTerritoryClick}
        colorFor={(t) => t.ownerClanColor ?? UNCLANNED_COLOR}
      />
      {topClans.length > 0 && (
        <div className="absolute top-3 right-3 z-[500] bg-midnight-raised/95 border border-border-ichor rounded-xl px-3 py-2.5 max-w-[180px] pointer-events-none">
          <div className="text-[10px] uppercase tracking-wide text-white/40 mb-1.5">Clans</div>
          <div className="space-y-1">
            {topClans.map((c) => (
              <div key={c.tag} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                <span className="truncate flex-1">{c.name}</span>
                <span className="text-white/40 shrink-0">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
