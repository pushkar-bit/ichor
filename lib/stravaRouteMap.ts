import { decodePolyline, simplifyPoints } from "./polyline";

/**
 * True on-the-ground aspect ratio (width:height) of the route's bounding box, correcting for
 * longitude compression at higher latitudes (1 degree of longitude is shorter than 1 degree of
 * latitude away from the equator). Clamped so a near-straight out-and-back route doesn't
 * collapse into a degenerate sliver image.
 */
function computeAspectRatio(points: [number, number][]): number {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const avgLat = (minLat + maxLat) / 2;

  const latSpanKm = Math.max((maxLat - minLat) * 111.32, 0.01);
  const lngSpanKm = Math.max((maxLng - minLng) * 111.32 * Math.cos((avgLat * Math.PI) / 180), 0.01);

  return Math.min(1.8, Math.max(0.55, lngSpanKm / latSpanKm));
}

/**
 * Renders a Strava route polyline as a static map image via LocationIQ (already configured for
 * geocoding — see lib/geocoding.ts). Sizes the image to the route's actual bounding-box aspect
 * ratio instead of a fixed square, so a long straight route isn't squished/cropped. Returns null
 * if LocationIQ isn't configured or the activity has no route data (e.g. a treadmill run).
 */
export function buildStravaRouteMapUrl(encodedPolyline: string | null | undefined): string | null {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey || !encodedPolyline) return null;

  const points = decodePolyline(encodedPolyline);
  if (points.length < 2) return null;

  const sampled = simplifyPoints(points, 150);
  const ratio = computeAspectRatio(sampled);
  const longSide = 640;
  const width = ratio >= 1 ? longSide : Math.round(longSide * ratio);
  const height = ratio >= 1 ? Math.round(longSide / ratio) : longSide;

  const path = sampled.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");
  const params = new URLSearchParams({ key: apiKey, size: `${width}x${height}`, format: "png" });
  // path's `|`/`:` separators are LocationIQ's expected literal syntax (Google Static Maps
  // compatible) — appended raw rather than through URLSearchParams so they aren't percent-encoded.
  return `https://maps.locationiq.com/v3/staticmap?${params.toString()}&path=weight:4|color:0xFC4C02|${path}`;
}
