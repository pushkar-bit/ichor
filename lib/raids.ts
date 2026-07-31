import { Territory } from "@/models/Territory";
import { Battle } from "@/models/Battle";
import { Workout } from "@/models/Workout";
import { User } from "@/models/User";
import { notify } from "./notifications";
import { award, RAID_WIN_POINTS, RAID_REPELLED_POINTS } from "./points";
import { colorForUser, isTerritoryEligibleRun, ATTACK_COVERAGE_THRESHOLD } from "./territoryEngine";
import { reverseGeocode } from "./geocoding";
import { buildRunCorridor, coverageRatio, splitTerritory, type TerritoryGeometry } from "./geo";

/**
 * Raids — contact without ceremony.
 *
 * A formal battle (lib/battles.ts) is a good mechanic and a slow one: 48h to respond, 72h to
 * run, a duel window to schedule. It's the right shape for taking a whole territory, and the
 * wrong shape for the everyday case, where a runner covers a corner of someone's ground and
 * wants something to happen *now*. Played only through battles, a user can go weeks without a
 * single moment of contact with another player, which is the real reason the map feels inert.
 *
 * A raid resolves in the same request:
 *   - you must have covered enough of the land (same bar as an attack)
 *   - but not too much — a raid takes a strip, not a territory. Past RAID_MAX_COVERAGE the
 *     stakes are too big to settle without giving the owner a say, so it's a battle instead.
 *   - your run is compared against the owner's claim run on pace, blind. Beat it and you
 *     carve off exactly the ground you ran. Miss and you take nothing and the owner is paid
 *     for the repel.
 *
 * Fog of war holds right up to the decision: the raider commits without ever seeing the
 * claim stats, and learns the outcome only after. What they *don't* get is a 72h wait.
 */

/** Same coverage floor as a formal attack — a raid is not an easier way in, just a faster one. */
export const RAID_MIN_COVERAGE = ATTACK_COVERAGE_THRESHOLD;
/** Above this share of a territory, the stakes belong in a battle the owner can answer. */
export const RAID_MAX_COVERAGE = 0.35;
/** Raid runs must be fresh, same as attack runs. */
const RAID_RUN_MAX_AGE_HOURS = 24;
/** Breathing room after a raid, win or lose — short, because raids are meant to be frequent. */
const RAID_SHIELD_HOURS = 24;
/** You can't keep raiding the same land; back off for a day even if you won. */
const SAME_TERRITORY_COOLDOWN_HOURS = 24;
/** Value the raided territory loses to the raider's strip, on top of the area it forfeits. */
const RAID_VALUE_KEEP = 0.9;

/** The stored run a raid is launched from — every eligibility rule is re-derived from this. */
type RaidRun = {
  _id: unknown;
  activityType: string;
  sourceType: string;
  verificationStatus: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  workoutDate: Date;
  createdAt: Date;
  route?: { type: string; coordinates: [number, number][] } | null;
};

export type RaidOutcome =
  | {
      ok: true;
      result: "TAKEN";
      territoryName: string;
      capturedAreaSqM: number;
      capturedValuePoints: number;
      newTerritoryId: string;
      pointsAwarded: number;
    }
  | { ok: true; result: "REPELLED"; territoryName: string; ownerName: string | null }
  | { ok: false; error: string; suggestBattle?: boolean };

/**
 * Runs one raid to completion. Every eligibility rule is re-derived server-side from the
 * stored route — the client sends only which run and which territory, never coverage or
 * stats.
 */
export async function raidTerritory(params: {
  raider: { _id: unknown; name?: string };
  workoutId: string;
  territoryId: string;
}): Promise<RaidOutcome> {
  const { raider, workoutId, territoryId } = params;
  const raiderId = String(raider._id);

  const workout = (await Workout.findOne({ _id: workoutId, userId: raider._id }).lean()) as RaidRun | null;
  if (!workout) return { ok: false, error: "Run not found." };
  if (!isTerritoryEligibleRun(workout)) return { ok: false, error: "Only GPS-verified runs can raid." };

  // Freshness is measured on ingest time as well as the athlete-editable workout date, so a
  // backdated Strava activity can't be re-pointed at "now" to unlock a raid (same rule as
  // createBattle in lib/battles.ts).
  const ingestAgeHours = (Date.now() - new Date(workout.createdAt).getTime()) / 3600e3;
  const runAgeHours = (Date.now() - new Date(workout.workoutDate).getTime()) / 3600e3;
  if (ingestAgeHours > RAID_RUN_MAX_AGE_HOURS || runAgeHours > RAID_RUN_MAX_AGE_HOURS) {
    return { ok: false, error: "That run is too old to raid with — raids come from a fresh run." };
  }

  const territory = await Territory.findById(territoryId);
  if (!territory) return { ok: false, error: "Territory not found." };
  if (String(territory.ownerId) === raiderId) return { ok: false, error: "You already hold this land." };
  if (territory.shieldUntil && territory.shieldUntil > new Date()) {
    return { ok: false, error: "This land is shielded after a recent fight." };
  }

  const activeBattle = await Battle.exists({ territoryId, status: { $ne: "RESOLVED" } });
  if (activeBattle) return { ok: false, error: "There's an active battle here — the land is already contested." };

  // One raid per territory per day, regardless of who ran it or how it went.
  const recentRaid = await Workout.exists({
    _id: { $ne: workout._id },
    raidedTerritoryIds: territoryId,
    createdAt: { $gte: new Date(Date.now() - SAME_TERRITORY_COOLDOWN_HOURS * 3600e3) },
  });
  if (recentRaid) return { ok: false, error: "This land was raided in the last day. Give it time." };

  const corridor = buildRunCorridor(workout.route!.coordinates);
  if (!corridor) return { ok: false, error: "Couldn't read this run's route." };

  const coverage = coverageRatio(corridor.geometry, territory.geometry as TerritoryGeometry);
  if (coverage < RAID_MIN_COVERAGE) {
    return {
      ok: false,
      error: `Your run covered ${Math.round(coverage * 100)}% of this land — raids need at least ${Math.round(RAID_MIN_COVERAGE * 100)}%.`,
    };
  }
  if (coverage > RAID_MAX_COVERAGE) {
    return {
      ok: false,
      suggestBattle: true,
      error: `You covered ${Math.round(coverage * 100)}% of this land — too much to settle with a raid. Launch a full attack and let them answer it.`,
    };
  }

  // Mark the attempt before resolving, so a repelled raid still burns the territory's daily
  // cooldown — otherwise a runner could probe the same land repeatedly for free.
  await Workout.updateOne({ _id: workout._id }, { $addToSet: { raidedTerritoryIds: territory._id } });

  const claimStats = territory.claimStats as { avgPaceMinPerKm: number | null } | null;
  const raiderPace = workout.avgPaceMinPerKm ?? Infinity;
  const holderPace = claimStats?.avgPaceMinPerKm ?? Infinity;
  const owner = (await User.findById(territory.ownerId).select("name").lean()) as { name?: string } | null;

  // --- Repelled: the raider didn't out-run the claim. ---
  if (!(raiderPace < holderPace)) {
    territory.shieldUntil = new Date(Date.now() + RAID_SHIELD_HOURS * 3600e3);
    await territory.save();

    await award(territory.ownerId, "RAID_REPELLED", RAID_REPELLED_POINTS, `raid:${workout._id}:${territory._id}:REPELLED`, {
      territoryId: territory._id,
      workoutId: workout._id,
    });
    await notify(
      territory.ownerId,
      "RAID_WON",
      `You repelled a raid on ${territory.name}`,
      `${raider.name ?? "A rival"} ran your ground but couldn't beat the pace that claimed it. +${RAID_REPELLED_POINTS} points.`,
      { territoryId: territory._id },
    );
    return { ok: true, result: "REPELLED", territoryName: territory.name, ownerName: owner?.name ?? null };
  }

  // --- Taken: carve off exactly the strip they ran. ---
  const split = splitTerritory(territory.geometry as TerritoryGeometry, corridor.geometry);
  if (!split || !split.ownerPiece) {
    // Nothing cleanly separable (or the strip covers the whole thing) — refuse rather than
    // hand over a territory outright, which is battle-sized stakes.
    return {
      ok: false,
      suggestBattle: true,
      error: "That line can't be carved off cleanly. Launch a full attack for this one.",
    };
  }

  const totalArea = split.attackerPiece.areaSqM + split.ownerPiece.areaSqM;
  const decayedTotal = Math.round(territory.valuePoints * RAID_VALUE_KEEP);
  const raiderValue = Math.round((decayedTotal * split.attackerPiece.areaSqM) / totalArea);

  const geo = await reverseGeocode(split.attackerPiece.centroid[1], split.attackerPiece.centroid[0]);
  const pieceName = geo?.road ?? geo?.district ?? `${raider.name ?? "Rival"}'s cut of ${territory.name}`;
  const now = new Date();

  const captured = await Territory.create({
    name: pieceName,
    ownerId: raider._id,
    color: colorForUser(raiderId),
    geometry: split.attackerPiece.geometry,
    bbox: split.attackerPiece.bbox,
    centroid: { type: "Point", coordinates: split.attackerPiece.centroid },
    areaSqM: split.attackerPiece.areaSqM,
    valuePoints: raiderValue,
    peakValuePoints: raiderValue,
    district: territory.district ?? null,
    city: territory.city ?? null,
    heldSince: now,
    lastActivityAt: now,
    claimRunId: workout._id,
    claimStats: {
      distanceKm: workout.distanceKm,
      avgPaceMinPerKm: workout.avgPaceMinPerKm,
      durationSeconds: workout.durationSeconds,
      workoutDate: workout.workoutDate,
    },
    parentTerritoryId: territory._id,
    shieldUntil: new Date(Date.now() + RAID_SHIELD_HOURS * 3600e3),
    distinctRunnerIds: [raider._id],
    totalVisits: 1,
    fameScore: 11,
  });

  territory.geometry = split.ownerPiece.geometry;
  territory.bbox = split.ownerPiece.bbox;
  territory.centroid = { type: "Point", coordinates: split.ownerPiece.centroid };
  territory.areaSqM = split.ownerPiece.areaSqM;
  territory.valuePoints = decayedTotal - raiderValue;
  territory.peakValuePoints = territory.valuePoints;
  territory.shieldUntil = new Date(Date.now() + RAID_SHIELD_HOURS * 3600e3);
  territory.lastActivityAt = now;
  await territory.save();

  await award(raider._id, "RAID_WIN", RAID_WIN_POINTS, `raid:${workout._id}:${territory._id}:WIN`, {
    territoryId: captured._id,
    workoutId: workout._id,
  });

  await notify(
    territory.ownerId,
    "RAID_LOST",
    `${raider.name ?? "A rival"} raided ${territory.name}`,
    "Their run beat the pace that claimed it, so they carved off the strip they ran. Run it back to take it — or raid them.",
    { territoryId: territory._id },
  );

  return {
    ok: true,
    result: "TAKEN",
    territoryName: territory.name,
    capturedAreaSqM: split.attackerPiece.areaSqM,
    capturedValuePoints: raiderValue,
    newTerritoryId: String(captured._id),
    pointsAwarded: RAID_WIN_POINTS,
  };
}
