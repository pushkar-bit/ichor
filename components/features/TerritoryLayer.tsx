"use client";

import { divIcon } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Polygon, Marker, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { MapTerritory } from "./TerritoryMap";
import { territoryLevel } from "@/lib/leveling";
import { LevelBadge } from "@/components/ui/LevelBadge";

/** Permanent name labels only on land big enough to hold them without cluttering the map. */
const PERMANENT_LABEL_MIN_SQM = 60_000;

function levelBadgeIcon(territory: MapTerritory, ringColor?: string) {
  const tier = territoryLevel(territory);
  const html = renderToStaticMarkup(
    <LevelBadge
      tier={tier}
      name={territory.name}
      isOwnedByUser={!ringColor && territory.isMine}
      isOwnedByClan={Boolean(ringColor)}
      clanColor={ringColor}
    />,
  );
  return divIcon({
    html,
    className: "", // strip Leaflet's default white-square divIcon styling
    iconSize: [tier.size, tier.size],
    iconAnchor: [tier.size / 2, tier.size / 2],
  });
}

/**
 * GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. A Polygon's rings map to
 * LatLng[][] (outer + holes) and a MultiPolygon to LatLng[][][] — react-leaflet's
 * <Polygon> accepts both natively, so donuts and split fragments render for free.
 */
export function toLeafletPositions(
  geometry: MapTerritory["geometry"],
): LatLngExpression[][] | LatLngExpression[][][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LatLngExpression));
  }
  return geometry.coordinates.map((poly) =>
    poly.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LatLngExpression)),
  );
}

/**
 * The territory polygons + name tooltips + level badges, shared by every map view (street,
 * territories-only, clan) so they never drift out of sync — only the color source and
 * background differ per view.
 */
export function TerritoryLayer({
  territories,
  onTerritoryClick,
  underAttackIds,
  colorFor,
}: {
  territories: MapTerritory[];
  onTerritoryClick: (territory: MapTerritory) => void;
  underAttackIds?: Set<string>;
  /** Override both the polygon fill/stroke AND the badge ring (e.g. color by clan instead
   * of by owner/tier). Returning null/undefined falls back to the default for that territory. */
  colorFor?: (territory: MapTerritory) => string | null | undefined;
}) {
  return (
    <>
      {territories.map((t) => {
        const shielded = t.shieldUntil && new Date(t.shieldUntil) > new Date();
        const underAttack = underAttackIds?.has(t.id) ?? false;
        const fill = colorFor?.(t) ?? t.color;
        return (
          <Polygon
            key={t.id}
            positions={toLeafletPositions(t.geometry)}
            pathOptions={{
              // Under-attack land gets an ignite outline so contested ground reads at a glance.
              color: underAttack ? "#FF5E1A" : t.isMine ? "#FFFFFF" : fill,
              weight: underAttack ? 4 : t.isMine ? 3 : 2,
              fillColor: fill,
              fillOpacity: t.isMine ? 0.45 : 0.3,
              dashArray: underAttack ? "2 6" : shielded ? "6 4" : undefined,
            }}
            eventHandlers={{ click: () => onTerritoryClick(t) }}
          >
            <Tooltip
              direction="top"
              offset={[0, -territoryLevel(t).size / 2]}
              permanent={t.areaSqM >= PERMANENT_LABEL_MIN_SQM}
              opacity={0.95}
              className="territory-label"
            >
              {t.ownerName ?? t.name}
            </Tooltip>
          </Polygon>
        );
      })}
      {territories.map((t) => (
        <Marker
          key={`level-${t.id}`}
          position={[t.centroid.lat, t.centroid.lng]}
          icon={levelBadgeIcon(t, colorFor?.(t) ?? undefined)}
          interactive={false}
        />
      ))}
    </>
  );
}
