import { connectDB } from "@/lib/mongodb";
import { Territory } from "@/models/Territory";
import { reverseGeocode } from "@/lib/geocoding";

/**
 * Backfills `district` / `city` on territories claimed before those fields existed.
 *
 * District standings (lib/districts.ts) aggregate on a value captured once at claim time, so
 * legacy territories carry no district and are simply absent from the standings — correct,
 * but it makes the whole local-scope feature look broken on an existing database.
 *
 * Reverse-geocodes each territory's stored centroid, the same call that named it originally.
 * Rate-limited: LocationIQ's free tier allows ~2 requests/second, and lib/geocoding.ts caches
 * each result in Redis for 24h, so a re-run is nearly free.
 *
 *   npx tsx --env-file=.env scripts/backfillTerritoryDistricts.ts
 */

/** LocationIQ free tier is ~2 req/s; stay comfortably under it. */
const REQUEST_INTERVAL_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!process.env.LOCATIONIQ_API_KEY) {
    console.error("[districts] LOCATIONIQ_API_KEY is not set — nothing to backfill against.");
    process.exit(1);
  }

  await connectDB();

  const pending = (await Territory.find({ district: null })
    .select("name centroid")
    .lean()) as unknown as { _id: unknown; name: string; centroid: { coordinates: [number, number] } }[];

  console.log(`[districts] ${pending.length} territor${pending.length === 1 ? "y" : "ies"} without a district`);

  let resolved = 0;
  let unresolved = 0;

  for (const t of pending) {
    const [lng, lat] = t.centroid.coordinates;
    const geo = await reverseGeocode(lat, lng);
    const district = geo?.district ?? geo?.city ?? null;

    if (district) {
      await Territory.updateOne({ _id: t._id }, { district, city: geo?.city ?? null });
      resolved++;
      console.log(`  ${t.name} → ${district}`);
    } else {
      unresolved++;
      console.log(`  ${t.name} → (no district returned)`);
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log(`[districts] resolved ${resolved}, unresolved ${unresolved}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[districts] failed:", err);
  process.exit(1);
});
