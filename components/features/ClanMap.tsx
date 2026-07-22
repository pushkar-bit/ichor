"use client";

import { Fragment, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { renderToStaticMarkup } from "react-dom/server";
import { divIcon } from "leaflet";
import { Polyline, Marker, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { MapTerritory } from "./TerritoryMap";

const TerritoryOnlyMap = dynamic(() => import("./TerritoryOnlyMap").then((m) => m.TerritoryOnlyMap), {
  ssr: false,
  loading: () => <div className="w-full h-full skeleton" />,
});

/** Land that belongs to nobody's clan reads as neutral stone, so clan-held ground pops. */
const UNCLANNED_COLOR = "#3a3a3a";
/** Zoomed in past this level, a clan's hub reveals how many members it has. */
const MEMBER_REVEAL_ZOOM = 14;

export type ClanGroup = {
  name: string;
  tag: string;
  color: string;
  count: number;
  memberCount: number;
  centroids: LatLngExpression[];
};

export function groupByClan(territories: MapTerritory[]): Map<string, ClanGroup> {
  const groups = new Map<string, ClanGroup>();
  for (const t of territories) {
    if (!t.ownerClanId) continue;
    const existing = groups.get(t.ownerClanId);
    const point: LatLngExpression = [t.centroid.lat, t.centroid.lng];
    if (existing) {
      existing.count += 1;
      existing.centroids.push(point);
    } else {
      groups.set(t.ownerClanId, {
        name: t.ownerClanName ?? "?",
        tag: t.ownerClanTag ?? "",
        color: t.ownerClanColor ?? "#AE93F4",
        memberCount: t.ownerClanMemberCount ?? 0,
        count: 1,
        centroids: [point],
      });
    }
  }
  return groups;
}

function hubOf(g: ClanGroup): LatLngExpression {
  return [
    g.centroids.reduce((s, c) => s + (c as [number, number])[0], 0) / g.centroids.length,
    g.centroids.reduce((s, c) => s + (c as [number, number])[1], 0) / g.centroids.length,
  ];
}

/**
 * The "Clan Empire" network — a hub-and-spoke web connecting every territory a clan holds
 * back to their combined center of mass, so scattered land reads as one interconnected
 * empire rather than disconnected dots. Each spoke is drawn twice: a wide, translucent line
 * underneath for a glow, and a thin bright one on top — Leaflet's SVG renderer has no native
 * blur filter, so this is the cheap equivalent.
 */
export function ClanNetworkLayer({ groups }: { groups: Map<string, ClanGroup> }) {
  return (
    <>
      {[...groups.values()]
        .filter((g) => g.centroids.length >= 2)
        .map((g, gi) => {
          const hub = hubOf(g);
          return g.centroids.map((c, ci) => (
            <Fragment key={`${gi}-${ci}`}>
              <Polyline
                positions={[hub, c]}
                pathOptions={{ color: g.color, weight: 10, opacity: 0.18 }}
                interactive={false}
              />
              <Polyline
                positions={[hub, c]}
                pathOptions={{ color: g.color, weight: 2, opacity: 0.85 }}
                interactive={false}
              />
            </Fragment>
          ));
        })}
    </>
  );
}

function memberBadgeIcon(g: ClanGroup) {
  const html = renderToStaticMarkup(
    <div
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: "#1A1A1A", border: `1.5px solid ${g.color}`, color: "#fff", boxShadow: `0 0 6px ${g.color}` }}
    >
      👥 {g.memberCount} member{g.memberCount === 1 ? "" : "s"} active here
    </div>,
  );
  return divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, -14] });
}

/** Zoom-aware: below MEMBER_REVEAL_ZOOM only the clan colors/network show; zoomed in past it,
 * each clan's hub reveals its member count — Task 3's "zoom to reveal members" interaction. */
function MemberRevealLayer({ groups }: { groups: Map<string, ClanGroup> }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });
  const currentZoom = zoom ?? map.getZoom();
  if (currentZoom < MEMBER_REVEAL_ZOOM) return null;

  return (
    <>
      {[...groups.values()].map((g, i) => (
        <Marker key={i} position={hubOf(g)} icon={memberBadgeIcon(g)} interactive={false} />
      ))}
    </>
  );
}

/**
 * "Clan territories" view — same tactical-grid map as the territories-only view, but every
 * territory is colored by its owner's clan instead of by owner or level tier, connected into
 * a glowing network per clan, with a legend of the top clans by land held. Zooming in on a
 * clan's cluster reveals how many members it has. Territories whose owner isn't in a clan
 * still render, in a neutral color, so the map doesn't look sparse.
 */
export function ClanMap({
  territories,
  onTerritoryClick,
}: {
  territories: MapTerritory[];
  onTerritoryClick: (territory: MapTerritory) => void;
}) {
  const clanGroups = useMemo(() => groupByClan(territories), [territories]);
  const topClans = useMemo(
    () => [...clanGroups.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    [clanGroups],
  );

  return (
    <div className="relative w-full h-full">
      <TerritoryOnlyMap
        territories={territories}
        onTerritoryClick={onTerritoryClick}
        colorFor={(t) => t.ownerClanColor ?? UNCLANNED_COLOR}
      >
        <ClanNetworkLayer groups={clanGroups} />
        <MemberRevealLayer groups={clanGroups} />
      </TerritoryOnlyMap>
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
          <p className="text-[10px] text-white/30 mt-1.5 pt-1.5 border-t border-border-ichor">
            Zoom in to see member counts
          </p>
        </div>
      )}
    </div>
  );
}
