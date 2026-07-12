/**
 * Replays every route-bearing Strava workout chronologically through the run-shaped
 * territory engine, so the map starts populated after the old zone system's data was
 * dropped. Safe to re-run: a run whose ground is already claimed simply claims nothing
 * new (and fame bumps are the only side effect).
 *
 * Run with: npm run backfill:territory
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { Workout } from "../models/Workout";
import { processRunForTerritory } from "../lib/territoryEngine";

async function main() {
  await connectDB();

  const workouts = await Workout.find({
    sourceType: "HEALTH_SYNC",
    activityType: "RUN",
    verificationStatus: "VERIFIED",
    route: { $exists: true },
  })
    .sort({ workoutDate: 1 })
    .lean();

  console.log(`Replaying ${workouts.length} route-bearing runs chronologically...`);

  const userCache = new Map<string, { _id: unknown; name?: string } | null>();
  let claimed = 0;

  for (const workout of workouts as any[]) {
    const userId = String(workout.userId);
    if (!userCache.has(userId)) {
      userCache.set(userId, await User.findById(userId).select("name").lean());
    }
    const user = userCache.get(userId);
    if (!user) continue;

    const result = await processRunForTerritory(user, workout);
    if (result.claimed) {
      claimed++;
      console.log(`  ${user.name ?? userId} claimed "${result.claimed.name}" (${result.claimed.areaSqM} m²)`);
    }
  }

  console.log(`Done. ${claimed} territories claimed from ${workouts.length} runs.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
