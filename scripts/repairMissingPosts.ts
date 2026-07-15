/**
 * CLI wrapper around lib/strava.ts's repairMissingStravaPosts() — finds Strava-sourced
 * Workouts with no matching Post and reprocesses them. See that function's doc comment for
 * why this exists: a bug in the territory/points/battle pipeline could otherwise strand a
 * synced run forever with no Post. The same repair also runs on a schedule via
 * app/api/cron/repair-missing-posts — this script is for on-demand / manual runs.
 *
 * Run with: npm run repair:missing-posts
 */
import { connectDB } from "../lib/mongodb";
import { repairMissingStravaPosts } from "../lib/strava";

async function main() {
  await connectDB();
  const { found, fixed, failures } = await repairMissingStravaPosts(500);

  console.log(`Found ${found} workout(s) missing a post. Fixed ${fixed}.`);
  for (const f of failures) {
    console.error(`  STILL FAILING — workout ${f.workoutId}: ${f.error}`);
  }
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
