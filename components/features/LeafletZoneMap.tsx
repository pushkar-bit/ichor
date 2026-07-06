"use client";

import { MapContainer, TileLayer, Circle, Tooltip } from "react-leaflet";
import type { Zone } from "./TerritoryMap";

export function LeafletZoneMap({
  zones,
  currentUserId,
  onZoneClick,
}: {
  zones: Zone[];
  currentUserId: string;
  onZoneClick: (zone: Zone) => void;
}) {
  const center: [number, number] =
    zones.length > 0 ? [zones[0].lat, zones[0].lng] : [28.6139, 77.209];

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", background: "#171516" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zones.map((zone) => {
        const isMine = zone.territory?.ownerId === currentUserId;
        const fill = zone.territory ? zone.territory.clanColor ?? zone.color : "#6b6568";
        return (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusMeters}
            pathOptions={{
              color: isMine ? "#AE93F4" : fill,
              weight: isMine ? 4 : 2,
              fillColor: fill,
              fillOpacity: zone.territory ? 0.35 : 0.12,
              dashArray: zone.territory ? undefined : "6 4",
            }}
            eventHandlers={{ click: () => onZoneClick(zone) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {zone.name}
            </Tooltip>
          </Circle>
        );
      })}
    </MapContainer>
  );
}
