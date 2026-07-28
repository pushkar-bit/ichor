"use client";

import { MapContainer } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { MapTerritory } from "./TerritoryMap";
import { TerritoryLayer } from "./TerritoryLayer";

/**
 * The "territories only" view — same land, same data, no OSM street tiles underneath. Just a
 * dark tactical grid so panning still reads as a map, and the polygons plus their level
 * badges are all that's on screen. An original ICHOR alternative to the real-world map, not
 * a copy of any base-building game's UI.
 */
export function TerritoryOnlyMap({
  territories,
  onTerritoryClick,
  underAttackIds,
  colorFor,
  children,
}: {
  territories: MapTerritory[];
  onTerritoryClick: (territory: MapTerritory) => void;
  underAttackIds?: Set<string>;
  colorFor?: (territory: MapTerritory) => string | null | undefined;
  /** Extra Leaflet layers rendered inside the same MapContainer, above the territory layer
   * (e.g. ClanMap's inter-territory network lines). */
  children?: React.ReactNode;
}) {
  let bounds: LatLngBoundsExpression | null = null;
  if (territories.length > 0) {
    let [minLng, minLat, maxLng, maxLat] = territories[0].bbox;
    for (const t of territories) {
      minLng = Math.min(minLng, t.bbox[0]);
      minLat = Math.min(minLat, t.bbox[1]);
      maxLng = Math.max(maxLng, t.bbox[2]);
      maxLat = Math.max(maxLat, t.bbox[3]);
    }
    bounds = [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  }

  return (
    <MapContainer
      {...(bounds
        ? { bounds, boundsOptions: { padding: [40, 40] } }
        : { center: [28.6139, 77.209] as LatLngExpression, zoom: 14 })}
      scrollWheelZoom={true}
      zoomControl={true}
      attributionControl={false}
      className="territory-grid-bg"
      style={{ height: "100%", width: "100%" }}
    >
      <TerritoryLayer
        territories={territories}
        onTerritoryClick={onTerritoryClick}
        underAttackIds={underAttackIds}
        colorFor={colorFor}
      />
      {children}
    </MapContainer>
  );
}
