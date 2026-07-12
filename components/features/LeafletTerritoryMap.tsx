"use client";

import { MapContainer, TileLayer, Polygon, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { MapTerritory } from "./TerritoryMap";

/** Permanent name labels only on land big enough to hold them without cluttering the map. */
const PERMANENT_LABEL_MIN_SQM = 60_000;

/**
 * GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. A Polygon's rings map to
 * LatLng[][] (outer + holes) and a MultiPolygon to LatLng[][][] — react-leaflet's
 * <Polygon> accepts both natively, so donuts and split fragments render for free.
 */
function toLeafletPositions(geometry: MapTerritory["geometry"]): LatLngExpression[][] | LatLngExpression[][][] {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LatLngExpression));
  }
  return geometry.coordinates.map((poly) =>
    poly.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LatLngExpression)),
  );
}

export function LeafletTerritoryMap({
  territories,
  onTerritoryClick,
}: {
  territories: MapTerritory[];
  onTerritoryClick: (territory: MapTerritory) => void;
}) {
  // Frame the whole empire: union of every territory's bbox ([minLng,minLat,maxLng,maxLat]).
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
      style={{ height: "100%", width: "100%", background: "#171516" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {territories.map((t) => {
        const shielded = t.shieldUntil && new Date(t.shieldUntil) > new Date();
        return (
          <Polygon
            key={t.id}
            positions={toLeafletPositions(t.geometry)}
            pathOptions={{
              color: t.isMine ? "#FFFFFF" : t.color,
              weight: t.isMine ? 3 : 2,
              fillColor: t.color,
              fillOpacity: t.isMine ? 0.45 : 0.3,
              dashArray: shielded ? "6 4" : undefined,
            }}
            eventHandlers={{ click: () => onTerritoryClick(t) }}
          >
            <Tooltip
              direction="center"
              permanent={t.areaSqM >= PERMANENT_LABEL_MIN_SQM}
              opacity={0.95}
              className="territory-label"
            >
              {t.ownerName ?? t.name}
            </Tooltip>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}
