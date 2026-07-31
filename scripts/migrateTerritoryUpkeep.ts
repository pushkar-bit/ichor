import { connectDB } from "@/lib/mongodb";
import { Territory } from "@/models/Territory";

/**
 * One-shot migration that opts pre-existing territories into upkeep (lib/territoryUpkeep.ts).
 *
 * Territories claimed before upkeep existed have no `lastActivityAt` / `heldSince` /
 * `peakValuePoints`. The schema defaults only apply to newly created documents, so without
 * this the sweep reads `undefined`, treats them as permanently fresh, and never touches them
 * — the feature would silently apply to new land only.
 *
 * The clocks are set to **now**, not to each territory's `createdAt`. Backdating would mean
 * shipping upkeep instantly fades (and, past 35 days, deletes) ground people earned under
 * rules where holding was permanent. Everyone gets the full grace period from the moment the
 * rule starts applying to them, which is the only fair way to introduce a decay mechanic.
 *
 *   npx tsx --env-file=.env scripts/migrateTerritoryUpkeep.ts
 */
async function main() {
  await connectDB();
  const now = new Date();

  const missingClocks = await Territory.updateMany(
    { $or: [{ lastActivityAt: { $exists: false } }, { heldSince: { $exists: false } }] },
    { $set: { lastActivityAt: now, heldSince: now, holdMilestoneDays: 0 } },
  );

  // Peak has to come from each doc's own current value, so this one can't be a blanket $set.
  const missingPeak = (await Territory.find({ peakValuePoints: { $exists: false } })
    .select("valuePoints")
    .lean()) as unknown as { _id: unknown; valuePoints: number }[];
  for (const t of missingPeak) {
    await Territory.updateOne({ _id: t._id }, { peakValuePoints: t.valuePoints ?? 1000 });
  }

  console.log(
    `[upkeep-migration] clocks set on ${missingClocks.modifiedCount} territor${
      missingClocks.modifiedCount === 1 ? "y" : "ies"
    }, peak value set on ${missingPeak.length}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[upkeep-migration] failed:", err);
  process.exit(1);
});
