import { haversineKm } from './haversine';

export interface GpxPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
}

const SLIDING_WINDOW = 5; // number of coordinate pairs for instant pace

/**
 * Calculates instant pace (min/km) from the last N coordinate pairs.
 * Returns 0 if insufficient data.
 */
export function instantPace(coords: GpxPoint[]): number {
  if (coords.length < 2) return 0;

  const window = coords.slice(-SLIDING_WINDOW);
  let distKm = 0;
  let durationMs = 0;

  for (let i = 1; i < window.length; i++) {
    distKm += haversineKm(window[i - 1]!, window[i]!);
    durationMs += window[i]!.timestamp - window[i - 1]!.timestamp;
  }

  if (distKm === 0 || durationMs === 0) return 0;

  const durationMin = durationMs / 1000 / 60;
  return durationMin / distKm;
}

/**
 * Average pace (min/km) from total distance and elapsed seconds.
 */
export function averagePace(distanceKm: number, durationSeconds: number): number {
  if (distanceKm === 0) return 0;
  return durationSeconds / 60 / distanceKm;
}

/**
 * Formats a min/km value → "5:30 /km". Returns "--:-- /km" for 0.
 */
export function formatPace(minPerKm: number): string {
  if (!minPerKm || minPerKm === 0 || !isFinite(minPerKm)) return '--:-- /km';
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /km`;
}

/**
 * Formats elapsed seconds → "mm:ss".
 */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Estimates calories burned.
 * MET for running ≈ 9.8. Calories = MET × weightKg × durationHours
 * Assumes average pace ~10 km/h for duration estimation from distance.
 */
export function estimateCalories(distanceKm: number, weightKg = 70): number {
  const MET = 9.8;
  const durationHours = distanceKm / 10;
  return Math.round(MET * weightKg * durationHours);
}

/**
 * Encodes a polyline for Google Static Maps API.
 * Based on Google's Encoded Polyline Algorithm Format.
 */
export function encodePolyline(coords: { latitude: number; longitude: number }[]): string {
  let output = '';
  let prevLat = 0;
  let prevLng = 0;

  const encodeValue = (val: number): string => {
    let result = '';
    let value = Math.round(val * 1e5);
    value = value < 0 ? ~(value << 1) : value << 1;
    while (value >= 0x20) {
      result += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
      value >>= 5;
    }
    result += String.fromCharCode(value + 63);
    return result;
  };

  for (const coord of coords) {
    output += encodeValue(coord.latitude - prevLat);
    output += encodeValue(coord.longitude - prevLng);
    prevLat = coord.latitude;
    prevLng = coord.longitude;
  }
  return output;
}
