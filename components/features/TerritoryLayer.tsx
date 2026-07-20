"use client";

import { divIcon } from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Polygon, Marker, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { MapTerritory } from "./TerritoryMap";
import { territoryLevel } from "@/lib/leveling";
import { LevelBadge } from "@/components/ui/LevelBadge";

export const LEVEL_BADGE_SIZE = 24;
/** Permanent name labels only on land big enough to hold them without cluttering the map. */
const PERMANENT_LABEL_MIN_SQM = 60_000;

function levelBadgeIcon(territory: MapTerritory) {
  const tier = territoryLevel(territory);
  const html = renderToStaticMarkup(<LevelBadge tier={tier} kind="territory" size={LEVEL_BADGE_SIZE} />);
  return divIcon({
    html,
    className: "", // strip Leaflet's default white-square divIcon styling
    iconSize: [LEVEL_BADGE_SIZE, LEVEL_BADGE_SIZE],
    iconAnchor: [LEVEL_BADGE_SIZE / 2, LEVEL_BADGE_SIZE / 2],
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
 * The territory polygons + name tooltips + level badges, shared by both the street-view map
 * (LeafletTerritoryMap, OSM tiles underneath) and the territories-only map (TerritoryOnlyMap,
 * dark tactical-grid background) so the two views never drift out of sync.
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
  /** Override the polygon's fill/stroke color (e.g. to color by clan instead of by owner). */
  colorFor?: (territory: MapTerritory) => string;
}) {
  return (
    <>
      {territories.map((t) => {
        const shielded = t.shieldUntil && new Date(t.shieldUntil) > new Date();
        const underAttack = underAttackIds?.has(t.id) ?? false;
        const fill = colorFor ? colorFor(t) : t.color;
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
              offset={[0, -LEVEL_BADGE_SIZE / 2]}
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
          icon={levelBadgeIcon(t)}
          interactive={false}
        />
      ))}
    </>
  );
}
