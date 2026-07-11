import { CampusZone } from "@/models/CampusZone";

const SAMPLE_COUNT = 50;
// A route that only clips a corner of a zone shouldn't count as "entering" it — require a
// real chunk of the sampled route to land inside the same zone.
const MIN_HIT_FRACTION = 0.15;

function sampleEvenly<T>(points: T[], count: number): T[] {
  if (points.length <= count) return points;
  const stride = points.length / count;
  const sampled: T[] = [];
  for (let i = 0; i < count; i++) sampled.push(points[Math.floor(i * stride)]);
  return sampled;
}

/**
 * Finds the CampusZone a run's GPS route actually passed through, if any. Samples the route
 * (activities can have thousands of points) and geo-matches each sample against zone polygons,
 * picking whichever zone won the most samples.
 */
export async function detectZoneForRoute(
  coordinates: [number, number][], // [lng, lat] pairs, GeoJSON order
): Promise<{ zoneId: string; hitFraction: number } | null> {
  if (coordinates.length === 0) return null;
  const sampled = sampleEvenly(coordinates, SAMPLE_COUNT);

  const results = await Promise.all(
    sampled.map(([lng, lat]) =>
      CampusZone.findOne({
        polygon: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lng, lat] } } },
      })
        .select("_id")
        .lean(),
    ),
  );

  const hits = new Map<string, number>();
  for (const zone of results) {
    if (!zone) continue;
    const id = String((zone as { _id: unknown })._id);
    hits.set(id, (hits.get(id) ?? 0) + 1);
  }
  if (hits.size === 0) return null;

  const [topZoneId, topCount] = [...hits.entries()].sort((a, b) => b[1] - a[1])[0];
  const hitFraction = topCount / sampled.length;
  if (hitFraction < MIN_HIT_FRACTION) return null;

  return { zoneId: topZoneId, hitFraction };
}
