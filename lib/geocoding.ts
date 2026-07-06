import { getWithCache, setWithTTL } from "./redis";

export type GeocodeResult = {
  district: string | null;
  city: string | null;
  state: string | null;
  formattedAddress: string;
};

/** Reverse-geocodes via LocationIQ (free tier), cached in Redis for 24h to save quota. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  const apiKey = process.env.LOCATIONIQ_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `geo:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = await getWithCache<GeocodeResult>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const address = data.address ?? {};

    const result: GeocodeResult = {
      district: address.suburb ?? address.county ?? address.city_district ?? null,
      city: address.city ?? address.town ?? address.state_district ?? null,
      state: address.state ?? null,
      formattedAddress: data.display_name ?? "",
    };

    await setWithTTL(cacheKey, JSON.stringify(result), 86400);
    return result;
  } catch (err) {
    console.error("[locationiq] reverseGeocode failed:", (err as Error).message);
    return null;
  }
}
