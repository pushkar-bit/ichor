/**
 * Haversine formula — calculates great-circle distance between two GPS coordinates.
 * Returns distance in kilometres.
 */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLon * sinDLon;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Total distance of an ordered array of GPS points in km.
 */
export function totalDistanceKm(
  coords: { latitude: number; longitude: number }[],
): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1]!, coords[i]!);
  }
  return total;
}
