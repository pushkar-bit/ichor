import type { Position } from "geojson";
import { Territory } from "@/models/Territory";
import { Battle } from "@/models/Battle";
import { reverseGeocode } from "./geocoding";
import { notify } from "./notifications";
import {
  buildTerritoryPolygon,
  buildRunCorridor,
  subtractTerritories,
  coverageRatio,
  bboxesIntersect,
  MAX_CLAIM_AREA_SQM,
  type Bbox,
  type TerritoryGeometry,
} from "./geo";

/**
 * The run→land pipeline: every GPS-verified run claims whatever unclaimed ground its corridor
 * covers, fame-bumps every territory it crosses, and surfaces attack opportunities (territories
 * it covered ≥40% of). Battles themselves live in lib/battles.ts — this module never transfers
 * ownership.
 */

export const ATTACK_COVERAGE_THRESHOLD = 0.4;
const MIN_CLAIM_RUN_KM = 1.5;
const MIN_PACE_MIN_PER_KM = 2.5; // faster than world record = not a run
const MAX_PACE_MIN_PER_KM = 12; // slower = walking with a run label
export const NEW_TERRITORY_VALUE = 1000;
/** A run covering at least this much of an existing territory credits its distance toward
 * that territory's fame — attack-independent, same threshold whether you're contesting the
 * land or just passing through most of it. */
export const DISTANCE_CREDIT_THRESHOLD = 0.06;
/** Each credited km bumps fame as much as roughly one new distinct runner would. */
const KM_TO_FAME_POINTS = 10;

/** Deterministic per-user territory color: 12 distinguishable hues on the dark map. */
const OWNER_COLORS = [
  "#AE93F4", // ichor purple
  "#D7F24C", // lime
  "#FF5E1A", // ignite orange
  "#4CC9F0", // sky
  "#F72585", // magenta
  "#43AA8B", // teal
  "#FFCA3A", // amber
  "#FF6B6B", // coral
  "#8AC926", // green
  "#6A8EAE", // steel blue
  "#E76FD3", // orchid
  "#F4A261", // sand
];

export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  return OWNER_COLORS[hash % OWNER_COLORS.length];
}

type WorkoutLike = {
  _id: unknown;
  activityType: string;
  sourceType: string;
  verificationStatus: string;
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  workoutDate: Date;
  route?: { type: string; coordinates: Position[] } | null;
};

type UserLike = { _id: unknown; name?: string };

/** The single gate for all territory interactions: only real, GPS-verified runs count. */
export function isTerritoryEligibleRun(workout: WorkoutLike): boolean {
  if (workout.sourceType !== "HEALTH_SYNC") return false;
  if (workout.verificationStatus !== "VERIFIED") return false;
  if (workout.activityType !== "RUN") return false;
  if (!workout.route || !Array.isArray(workout.route.coordinates) || workout.route.coordinates.length < 2) return false;
  const pace = workout.avgPaceMinPerKm;
  if (pace != null && (pace < MIN_PACE_MIN_PER_KM || pace > MAX_PACE_MIN_PER_KM)) return false;
  return true;
}

/**
 * Every visit makes land more famous, independent of ownership. Caller saves the doc.
 *
 * When `run` is given and its coverage of this territory clears DISTANCE_CREDIT_THRESHOLD,
 * the run's distance is also credited toward the territory's total — attack or not, whoever's
 * run it is. This is separate from (and a lower bar than) ATTACK_COVERAGE_THRESHOLD: covering
 * enough of someone's land to matter for the leaderboard doesn't require covering enough of
 * it to contest ownership.
 */
export function bumpFame(
  territory: { distinctRunnerIds: unknown[]; totalVisits: number; fameScore: number; totalDistanceKm: number },
  userId: string,
  run?: { distanceKm: number; coverage: number },
) {
  const alreadyRan = territory.distinctRunnerIds.some((id) => String(id) === String(userId));
  if (!alreadyRan) territory.distinctRunnerIds.push(userId);
  territory.totalVisits += 1;

  if (run && run.coverage >= DISTANCE_CREDIT_THRESHOLD) {
    territory.totalDistanceKm = Math.round((territory.totalDistanceKm + run.distanceKm) * 100) / 100;
  }

  territory.fameScore =
    territory.distinctRunnerIds.length * 10 + territory.totalVisits + Math.round(territory.totalDistanceKm * KM_TO_FAME_POINTS);
}

async function nameForTerritory(centroidLngLat: [number, number], ownerName: string, ownerId: string): Promise<string> {
  const geo = await reverseGeocode(centroidLngLat[1], centroidLngLat[0]);
  const place = geo?.road ?? geo?.district ?? geo?.city ?? null;
  if (place) return place;
  const count = await Territory.countDocuments({ ownerId });
  return `${ownerName}'s Run #${count + 1}`;
}

export type AttackOpportunity = {
  territoryId: string;
  territoryName: string;
  ownerId: string;
  ownerName: string | null;
  coverage: number; // 0..1
};

export type ClaimedTerritorySummary = {
  territoryId: string;
  name: string;
  areaSqM: number;
  valuePoints: number;
};

export type TerritoryRunResult = {
  claimed: ClaimedTerritorySummary | null;
  opportunities: AttackOpportunity[];
};

type StoredTerritory = {
  _id: unknown;
  name: string;
  ownerId: unknown;
  geometry: TerritoryGeometry;
  bbox: Bbox;
  shieldUntil: Date | null;
  distinctRunnerIds: unknown[];
  totalVisits: number;
  totalDistanceKm: number;
  fameScore: number;
  save: () => Promise<unknown>;
};

/**
 * Processes one run for the territory game. Auto-claims unclaimed ground (claiming is never a
 * choice), fame-bumps crossed territories, and returns attack opportunities for the caller to
 * surface — attacking IS a choice, so nothing here creates battles.
 *
 * `notifyOpportunities` is for the webhook path where no user is live to see the response:
 * each opportunity becomes an ATTACK_OPPORTUNITY inbox item instead. The manual-post path
 * leaves it false and surfaces the prompt from the API response directly.
 */
export async function processRunForTerritory(
  user: UserLike,
  workout: WorkoutLike,
  { notifyOpportunities = false }: { notifyOpportunities?: boolean } = {},
): Promise<TerritoryRunResult> {
  const empty: TerritoryRunResult = { claimed: null, opportunities: [] };
  if (!isTerritoryEligibleRun(workout) || workout.distanceKm < MIN_CLAIM_RUN_KM) return empty;

  const route = workout.route!.coordinates;
  const built = buildTerritoryPolygon(route);
  const corridor = buildRunCorridor(route);
  if (!built || !corridor) return empty;

  const userId = String(user._id);

  // Bbox pre-filter, exact math in turf. Territory counts are campus-pilot scale; loading
  // candidate docs wholesale is deliberate (see models/Territory.ts on why no 2dsphere).
  const candidates = (await Territory.find({
    "bbox.0": { $lte: built.bbox[2] },
    "bbox.2": { $gte: built.bbox[0] },
  }).populate("ownerId", "name")) as unknown as (StoredTerritory & {
    ownerId: { _id: unknown; name?: string } | null;
  })[];

  const overlapping = candidates.filter((t) => bboxesIntersect(t.bbox, built.bbox));

  const opportunities: AttackOpportunity[] = [];
  const overlappedGeometries: TerritoryGeometry[] = [];

  for (const territory of overlapping) {
    const coverage = coverageRatio(corridor.geometry, territory.geometry);
    if (coverage <= 0) continue;

    overlappedGeometries.push(territory.geometry);
    bumpFame(territory, userId, { distanceKm: workout.distanceKm, coverage });
    await territory.save();

    const ownerId = territory.ownerId ? String(territory.ownerId._id ?? territory.ownerId) : null;
    const shielded = territory.shieldUntil && new Date(territory.shieldUntil) > new Date();
    if (ownerId && ownerId !== userId && coverage >= ATTACK_COVERAGE_THRESHOLD && !shielded) {
      const activeBattle = await Battle.exists({ territoryId: territory._id, status: { $ne: "RESOLVED" } });
      if (!activeBattle) {
        opportunities.push({
          territoryId: String(territory._id),
          territoryName: territory.name,
          ownerId,
          ownerName: territory.ownerId?.name ?? null,
          coverage: Math.round(coverage * 100) / 100,
        });
      }
    }
  }

  // Whatever ground the run covered that nobody owns becomes this runner's new territory.
  const remainder = subtractTerritories(built.geometry, overlappedGeometries);
  let claimed: ClaimedTerritorySummary | null = null;

  if (remainder) {
    const ownerName = user.name ?? "Athlete";
    const name = await nameForTerritory(remainder.centroid, ownerName, userId);
    // An over-cap ultra keeps its land but the value is clamped pro-rata to the cap.
    const valuePoints = built.exceededAreaCap
      ? Math.round(NEW_TERRITORY_VALUE * (MAX_CLAIM_AREA_SQM / remainder.areaSqM))
      : NEW_TERRITORY_VALUE;

    const doc = await Territory.create({
      name,
      ownerId: user._id,
      color: colorForUser(userId),
      geometry: remainder.geometry,
      bbox: remainder.bbox,
      centroid: { type: "Point", coordinates: remainder.centroid },
      areaSqM: remainder.areaSqM,
      valuePoints,
      claimRunId: workout._id,
      claimStats: {
        distanceKm: workout.distanceKm,
        avgPaceMinPerKm: workout.avgPaceMinPerKm,
        durationSeconds: workout.durationSeconds,
        workoutDate: workout.workoutDate,
      },
      distinctRunnerIds: [user._id],
      totalVisits: 1,
      fameScore: 11,
    });

    claimed = { territoryId: String(doc._id), name, areaSqM: remainder.areaSqM, valuePoints };

    await notify(
      user._id,
      "TERRITORY_CLAIMED",
      `You claimed ${name}`,
      `Your run took ${Math.round(remainder.areaSqM / 1000)}k m² of new ground, worth ${valuePoints} points.`,
      { territoryId: doc._id, workoutId: workout._id },
    );
  }

  if (notifyOpportunities) {
    for (const opp of opportunities) {
      await notify(
        user._id,
        "ATTACK_OPPORTUNITY",
        `You ran ${Math.round(opp.coverage * 100)}% of ${opp.territoryName}`,
        `${opp.ownerName ?? "Another athlete"} holds this land. Open the map to launch an attack.`,
        { territoryId: opp.territoryId, workoutId: workout._id },
      );
    }
  }

  return { claimed, opportunities };
}

export async function getTerritoryFameLeaderboard(limit = 20) {
  const territories = await Territory.find({ fameScore: { $gt: 0 } })
    .sort({ fameScore: -1 })
    .limit(limit)
    .populate("ownerId", "name avatarUrl")
    .lean();

  return territories.map((t: any) => ({
    territoryId: String(t._id),
    territoryName: t.name,
    ownerId: t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null,
    ownerName: t.ownerId?.name ?? null,
    ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
    fameScore: t.fameScore,
    distinctRunners: t.distinctRunnerIds?.length ?? 0,
    totalVisits: t.totalVisits ?? 0,
    totalDistanceKm: t.totalDistanceKm ?? 0,
  }));
}
