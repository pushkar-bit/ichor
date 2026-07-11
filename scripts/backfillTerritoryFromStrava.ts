/**
 * One-time backfill: for Strava-sourced Workouts synced before route/zone-detection existed
 * (see lib/strava.ts ingestStravaActivity), re-fetch each activity's polyline from Strava,
 * store the route, detect which CampusZone it passed through, and run it through the same
 * claimZone() territory logic new syncs already get.
 *
 * Only touches Workouts with sourceType HEALTH_SYNC, an externalId (so we know the Strava
 * activity id to re-fetch), and no route yet — safe to re-run, it's a no-op on anything
 * already backfilled.
 *
 * Run with: npm run backfill:territory
 */
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { Workout } from "../models/Workout";
import { Post } from "../models/Post";
import { ensureFreshStravaToken, fetchStravaActivity } from "../lib/strava";
import { decodePolyline } from "../lib/polyline";
import { detectZoneForRoute } from "../lib/zoneDetection";
import { claimZone } from "../lib/territory";

async function main() {
  await connectDB();

  const stravaUsers = await User.find({ stravaAthleteId: { $ne: null } });
  console.log(`Found ${stravaUsers.length} Strava-linked user(s).`);

  let scanned = 0;
  let zonesAssigned = 0;
  let skippedNoRoute = 0;

  for (const user of stravaUsers) {
    const workouts = await Workout.find({
      userId: user._id,
      sourceType: "HEALTH_SYNC",
      externalId: { $regex: /^strava:/ },
      route: { $exists: false },
    });
    if (workouts.length === 0) continue;

    console.log(`\n${user.name ?? user.email} — ${workouts.length} workout(s) to backfill`);

    let accessToken: string;
    try {
      accessToken = await ensureFreshStravaToken(user);
    } catch (err) {
      console.warn(`  Skipping — couldn't refresh Strava token: ${(err as Error).message}`);
      continue;
    }

    for (const workout of workouts) {
      scanned++;
      const activityId = Number(workout.externalId!.replace("strava:", ""));
      try {
        const activity = await fetchStravaActivity(accessToken, activityId);
        const encoded = activity.map?.summary_polyline ?? activity.map?.polyline;
        if (!encoded) {
          skippedNoRoute++;
          continue;
        }

        const routeCoordinates: [number, number][] = decodePolyline(encoded).map(([lat, lng]) => [lng, lat]);
        // A near-zero-movement activity decodes to identical points, which Mongo rejects as
        // an invalid LineString (needs 2+ distinct vertices) — and it's not a real route anyway.
        const distinctPoints = new Set(routeCoordinates.map(([lng, lat]) => `${lng},${lat}`)).size;
        if (distinctPoints < 2) {
          skippedNoRoute++;
          console.log(`  Workout ${workout._id} — GPS trace is a single point (no real movement), skipping`);
          continue;
        }
        workout.route = { type: "LineString", coordinates: routeCoordinates };
        await workout.save();

        const detected = await detectZoneForRoute(routeCoordinates);
        if (!detected) continue;

        await claimZone(String(user._id), detected.zoneId, workout.caloriesBurned);
        await Post.updateOne({ workoutId: workout._id, locationZoneId: null }, { locationZoneId: detected.zoneId });
        zonesAssigned++;
        console.log(`  Workout ${workout._id} → zone ${detected.zoneId} (${Math.round(detected.hitFraction * 100)}% of route)`);
      } catch (err) {
        console.warn(`  Failed on workout ${workout._id}: ${(err as Error).message}`);
      }
    }
  }

  console.log(`\nDone. Scanned ${scanned} workout(s), assigned a zone to ${zonesAssigned}, ${skippedNoRoute} had no GPS data.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
