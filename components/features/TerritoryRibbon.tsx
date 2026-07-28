"use client";

import Link from "next/link";
import { Crown, Footprints, MapPin, Swords } from "lucide-react";
import { TerritoryMiniMap, type Bbox, type PolygonGeometry } from "./TerritoryMiniMap";

/**
 * What a run did to the map, on the run's own feed card.
 *
 * This is the change that moves territory from "a page you have to go find" to "the thing
 * this app does". Land only becomes a social object once other people see it happen — a
 * claim that resolves into a push notification is private, and private rewards don't spread.
 *
 * Two lines, both derived entirely from the Post's snapshot (no fetch, no turf):
 *   - the ground this run took, with its actual silhouette
 *   - whose ground it ran through, which is where rivalry starts
 *
 * Fog of war is intact: this says what land was crossed and who holds it, never the run
 * behind someone else's claim.
 */

export type PostTerritorySnapshot = {
  claimed: {
    territoryId: string;
    name: string;
    areaSqM: number;
    valuePoints: number;
    color: string;
    geometry: PolygonGeometry;
    bbox: Bbox;
  } | null;
  crossed: {
    territoryId: string;
    name: string;
    ownerId: string | null;
    ownerName: string | null;
    coveragePct: number;
    isRival: boolean;
  }[];
  district: string | null;
};

function formatArea(areaSqM: number): string {
  if (areaSqM >= 1_000_000) return `${(areaSqM / 1_000_000).toFixed(2)} km²`;
  return `${Math.round(areaSqM / 1000)}k m²`;
}

/** "Priya's Canal Road", "Canal Road (yours)", or just the name for unclaimed ground. */
function crossedLabel(c: PostTerritorySnapshot["crossed"][number], isOwnPost: boolean): string {
  if (!c.ownerName) return c.name;
  if (!c.isRival) return isOwnPost ? `${c.name} — your own ground` : c.name;
  return `${c.ownerName}'s ${c.name}`;
}

export function TerritoryRibbon({
  snapshot,
  isOwnPost,
  authorName,
}: {
  snapshot: PostTerritorySnapshot;
  isOwnPost: boolean;
  authorName: string;
}) {
  const { claimed, crossed, district } = snapshot;
  // Own land the runner merely re-ran isn't news; rival ground always is.
  const rivals = crossed.filter((c) => c.isRival);
  if (!claimed && rivals.length === 0) return null;

  const who = isOwnPost ? "You" : authorName;

  return (
    <div className="border-t-2 border-border-ichor bg-black/30 px-4 py-3">
      {claimed && (
        <Link href="/map" className="flex items-center gap-3 group">
          <div className="shrink-0 rounded-none border-2 border-border-ichor overflow-hidden bg-midnight">
            <TerritoryMiniMap
              geometry={claimed.geometry}
              bbox={claimed.bbox}
              color={claimed.color}
              width={104}
              height={72}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-lime">
              <Crown className="w-3 h-3" /> Land claimed
            </div>
            <div className="font-bold text-sm mt-0.5 truncate group-hover:text-momentum transition-colors">
              {claimed.name}
            </div>
            <div className="text-xs text-white/45 mt-0.5">
              {who} took {formatArea(claimed.areaSqM)}
              {district ? ` in ${district}` : ""} · worth {claimed.valuePoints} pts
            </div>
          </div>
        </Link>
      )}

      {rivals.length > 0 && (
        <div className={claimed ? "mt-3 pt-3 border-t border-white/[0.07]" : ""}>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ignite">
            <Swords className="w-3 h-3" /> Ran through rival ground
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {rivals.slice(0, 3).map((c) => (
              <span key={c.territoryId} className="inline-flex items-center gap-1.5 text-xs text-white/55">
                <MapPin className="w-3 h-3 text-white/25 shrink-0" />
                <span className="truncate max-w-[190px]">{crossedLabel(c, isOwnPost)}</span>
                <span className="text-white/30">{c.coveragePct}%</span>
              </span>
            ))}
            {rivals.length > 3 && <span className="text-xs text-white/30">+{rivals.length - 3} more</span>}
          </div>
        </div>
      )}

      {!claimed && rivals.length > 0 && (
        <p className="mt-2 text-[11px] text-white/30 inline-flex items-center gap-1.5">
          <Footprints className="w-3 h-3" /> Every kilometre through held land pays its owner — and makes it famous.
        </p>
      )}
    </div>
  );
}
