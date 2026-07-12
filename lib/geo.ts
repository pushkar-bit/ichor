import area from "@turf/area";
import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import buffer from "@turf/buffer";
import centroid from "@turf/centroid";
import cleanCoords from "@turf/clean-coords";
import difference from "@turf/difference";
import distance from "@turf/distance";
import intersect from "@turf/intersect";
import rewind from "@turf/rewind";
import simplify from "@turf/simplify";
import truncate from "@turf/truncate";
import union from "@turf/union";
import unkinkPolygon from "@turf/unkink-polygon";
import { featureCollection, lineString, polygon as toPolygonFeature, point } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

/**
 * All-things-geometry for run-shaped territories. Territories are built by buffering a run's
 * GPS trace into a corridor polygon; every later question (can I attack it? how do we split
 * it?) is answered here with turf's planar math rather than MongoDB geo queries — Mongo's
 * 2dsphere index rejects imperfect polygons at insert time, and buffered/differenced
 * real-world geometry can't be guaranteed perfect, so territory geometry is deliberately
 * stored unindexed (bbox + centroid carry the indexable parts).
 */

export type TerritoryGeometry = Polygon | MultiPolygon;
type PolyFeature = Feature<Polygon | MultiPolygon>;

/** Corridor half-width: a 45m buffer makes a ~90m-wide strip of claimed land around the path. */
const CORRIDOR_RADIUS_KM = 0.045;
/** Narrower fallback when a very long run would blow past the area cap at full width. */
const NARROW_CORRIDOR_RADIUS_KM = 0.03;
/** Endpoints closer than this are treated as a closed loop (fills the enclosed area). */
const LOOP_CLOSE_MAX_KM = 0.1;
/** Enclosed holes up to this size get filled ("your lap around the park claims the park"). */
const HOLE_FILL_MAX_SQM = 500_000;
/** A single claim can't take more than this much land no matter how long the run. */
export const MAX_CLAIM_AREA_SQM = 2_000_000;
/** Fragments below this are noise from boolean ops — merged away or dropped. */
const SLIVER_SQM = 5_000;
/** A claim remainder below this isn't worth a territory (the run was ~all inside claimed land). */
export const MIN_CLAIM_AREA_SQM = 15_000;
/** Douglas-Peucker tolerance in degrees, ~5m — kills GPS jitter without changing shape. */
const SIMPLIFY_TOLERANCE_DEG = 0.00005;

/** [minLng, minLat, maxLng, maxLat] */
export type Bbox = [number, number, number, number];

function asFeature(geometry: TerritoryGeometry): PolyFeature {
  return { type: "Feature", properties: {}, geometry };
}

function polygonsOf(feature: PolyFeature): Position[][][] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

function fromPolygons(polys: Position[][][]): PolyFeature | null {
  if (polys.length === 0) return null;
  if (polys.length === 1) return toPolygonFeature(polys[0]) as PolyFeature;
  return { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } };
}

/**
 * Boolean ops on real GPS-derived shapes leave float-noise self-intersections and duplicate
 * vertices behind; every polygon that leaves this module goes through here first.
 */
export function sanitizePolygon(feature: PolyFeature): PolyFeature | null {
  try {
    let cleaned = truncate(feature, { precision: 6, mutate: false }) as PolyFeature;
    cleaned = cleanCoords(cleaned) as PolyFeature;

    const unkinked = unkinkPolygon(cleaned as Feature<Polygon | MultiPolygon>);
    const keepers = unkinked.features.filter((f) => area(f) >= SLIVER_SQM);
    if (keepers.length === 0) return null;

    let merged: PolyFeature = keepers[0] as PolyFeature;
    for (let i = 1; i < keepers.length; i++) {
      const u = union(featureCollection([merged, keepers[i]] as Feature<Polygon | MultiPolygon>[]));
      if (u) merged = u as PolyFeature;
    }

    return rewind(merged, { mutate: false }) as PolyFeature;
  } catch {
    return null;
  }
}

/** Fills interior rings (holes) smaller than HOLE_FILL_MAX_SQM — a lap's enclosed area is claimed land. */
function fillSmallHoles(feature: PolyFeature): PolyFeature {
  const polys = polygonsOf(feature).map((rings) => {
    const [outer, ...holes] = rings;
    const keptHoles = holes.filter((hole) => {
      try {
        return area(toPolygonFeature([hole])) > HOLE_FILL_MAX_SQM;
      } catch {
        return false; // malformed ring — drop it
      }
    });
    return [outer, ...keptHoles];
  });
  return fromPolygons(polys) ?? feature;
}

export type BuiltTerritory = {
  geometry: TerritoryGeometry;
  areaSqM: number;
  bbox: Bbox;
  centroid: [number, number]; // [lng, lat]
  /** True when the corridor exceeded MAX_CLAIM_AREA_SQM even at reduced width (ultra runs). */
  exceededAreaCap: boolean;
};

/**
 * Turns a run's GPS trace into a territory polygon: simplify → close near-loops → buffer into
 * a corridor → fill small enclosed holes → keep under the area cap (fallback ladder: keep the
 * donut, then narrow the corridor, then accept-but-flag — a legit ultra is never rejected).
 */
export function buildTerritoryPolygon(route: Position[]): BuiltTerritory | null {
  if (!route || route.length < 2) return null;

  const distinct = route.filter(
    (p, i) => i === 0 || p[0] !== route[i - 1][0] || p[1] !== route[i - 1][1],
  );
  if (distinct.length < 2) return null;

  let line = lineString(distinct);
  try {
    line = simplify(line, { tolerance: SIMPLIFY_TOLERANCE_DEG, highQuality: false, mutate: false });
  } catch {
    // simplify can throw on degenerate input; the raw line still buffers fine
  }

  const coords = line.geometry.coordinates;
  const first = coords[0];
  const last = coords[coords.length - 1];
  const isLoop = distance(point(first), point(last), { units: "kilometers" }) <= LOOP_CLOSE_MAX_KM;
  if (isLoop && (first[0] !== last[0] || first[1] !== last[1])) {
    line = lineString([...coords, first]);
  }

  const buildAt = (radiusKm: number): PolyFeature | null => {
    const buffered = buffer(line, radiusKm, { units: "kilometers", steps: 8 });
    if (!buffered) return null;
    return sanitizePolygon(buffered as PolyFeature);
  };

  let corridor = buildAt(CORRIDOR_RADIUS_KM);
  if (!corridor) return null;

  let result = fillSmallHoles(corridor);
  let exceededAreaCap = false;

  if (area(result) > MAX_CLAIM_AREA_SQM) {
    result = corridor; // step 1: give the donut back its hole
  }
  if (area(result) > MAX_CLAIM_AREA_SQM) {
    const narrow = buildAt(NARROW_CORRIDOR_RADIUS_KM);
    if (narrow) {
      corridor = narrow;
      result = area(fillSmallHoles(narrow)) <= MAX_CLAIM_AREA_SQM ? fillSmallHoles(narrow) : narrow;
    }
  }
  if (area(result) > MAX_CLAIM_AREA_SQM) {
    exceededAreaCap = true; // step 3: accept anyway, caller clamps the value instead
  }

  const final = sanitizePolygon(result);
  if (!final) return null;

  const c = centroid(final).geometry.coordinates as [number, number];
  return {
    geometry: final.geometry,
    areaSqM: Math.round(area(final)),
    bbox: bbox(final) as Bbox,
    centroid: c,
    exceededAreaCap,
  };
}

/** The attack corridor is the plain buffered route (no hole-filling — you attack what you ran). */
export function buildRunCorridor(route: Position[]): BuiltTerritory | null {
  if (!route || route.length < 2) return null;
  const distinct = route.filter(
    (p, i) => i === 0 || p[0] !== route[i - 1][0] || p[1] !== route[i - 1][1],
  );
  if (distinct.length < 2) return null;

  let line = lineString(distinct);
  try {
    line = simplify(line, { tolerance: SIMPLIFY_TOLERANCE_DEG, highQuality: false, mutate: false });
  } catch {
    // fall through with the raw line
  }
  const buffered = buffer(line, CORRIDOR_RADIUS_KM, { units: "kilometers", steps: 8 });
  if (!buffered) return null;
  const clean = sanitizePolygon(buffered as PolyFeature);
  if (!clean) return null;

  const c = centroid(clean).geometry.coordinates as [number, number];
  return {
    geometry: clean.geometry,
    areaSqM: Math.round(area(clean)),
    bbox: bbox(clean) as Bbox,
    centroid: c,
    exceededAreaCap: false,
  };
}

export function bboxesIntersect(a: Bbox, b: Bbox): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

/** Fraction of `territory` covered by `corridor` (0..1). */
export function coverageRatio(corridor: TerritoryGeometry, territory: TerritoryGeometry): number {
  try {
    const overlap = intersect(featureCollection([asFeature(corridor), asFeature(territory)]));
    if (!overlap) return 0;
    const territoryArea = area(asFeature(territory));
    if (territoryArea === 0) return 0;
    return area(overlap) / territoryArea;
  } catch {
    return 0;
  }
}

/**
 * What's left of a fresh claim once existing territories are carved out. Null when nothing
 * meaningful remains (the run was essentially all inside already-claimed land).
 */
export function subtractTerritories(
  built: TerritoryGeometry,
  existing: TerritoryGeometry[],
): BuiltTerritory | null {
  let remainder: PolyFeature | null = asFeature(built);
  for (const geom of existing) {
    if (!remainder) return null;
    try {
      remainder = difference(featureCollection([remainder, asFeature(geom)])) as PolyFeature | null;
    } catch {
      // A malformed stored polygon shouldn't block a new claim; skip carving this one.
    }
  }
  if (!remainder) return null;

  // Drop sliver fragments of the remainder (crumbs along another territory's edge).
  const polys = polygonsOf(remainder).filter((rings) => {
    try {
      return area(toPolygonFeature([rings[0]])) >= SLIVER_SQM;
    } catch {
      return false;
    }
  });
  const rebuilt = fromPolygons(polys);
  if (!rebuilt) return null;

  const clean = sanitizePolygon(rebuilt);
  if (!clean) return null;
  const total = area(clean);
  if (total < MIN_CLAIM_AREA_SQM) return null;

  const c = centroid(clean).geometry.coordinates as [number, number];
  return {
    geometry: clean.geometry,
    areaSqM: Math.round(total),
    bbox: bbox(clean) as Bbox,
    centroid: c,
    exceededAreaCap: false,
  };
}

export type SplitResult = {
  attackerPiece: BuiltTerritory;
  ownerPiece: BuiltTerritory | null; // null = the attack covered essentially everything
};

/**
 * Refusal split: the attacker takes the part of the territory their corridor covered; the
 * owner keeps the rest. Slivers get merged into the other side rather than dropped so no
 * orphan crumbs ever render on the map.
 */
export function splitTerritory(
  territory: TerritoryGeometry,
  attackCorridor: TerritoryGeometry,
): SplitResult | null {
  let attackerPiece: PolyFeature | null;
  let ownerPiece: PolyFeature | null;
  try {
    attackerPiece = intersect(
      featureCollection([asFeature(attackCorridor), asFeature(territory)]),
    ) as PolyFeature | null;
    ownerPiece = difference(
      featureCollection([asFeature(territory), asFeature(attackCorridor)]),
    ) as PolyFeature | null;
  } catch {
    return null;
  }
  if (!attackerPiece) return null;

  // Sliver rule: tiny fragments belong to whichever side isn't tiny.
  if (ownerPiece && area(ownerPiece) < SLIVER_SQM) {
    ownerPiece = null; // attacker effectively took the whole thing
  }
  if (area(attackerPiece) < SLIVER_SQM) {
    return null; // nothing meaningful changes hands — treat as un-splittable
  }

  const attackerClean = sanitizePolygon(attackerPiece);
  if (!attackerClean) return null;
  const ownerClean = ownerPiece ? sanitizePolygon(ownerPiece) : null;

  const toBuilt = (f: PolyFeature): BuiltTerritory => ({
    geometry: f.geometry,
    areaSqM: Math.round(area(f)),
    bbox: bbox(f) as Bbox,
    centroid: centroid(f).geometry.coordinates as [number, number],
    exceededAreaCap: false,
  });

  return {
    attackerPiece: toBuilt(attackerClean),
    ownerPiece: ownerClean ? toBuilt(ownerClean) : null,
  };
}

const QUALIFY_SAMPLE_COUNT = 50;
const QUALIFY_MIN_INSIDE_FRACTION = 0.25;

/** Did enough of this run happen inside the territory to count for an async/duel entry? */
export function runQualifiesInTerritory(route: Position[], territory: TerritoryGeometry): boolean {
  if (!route || route.length === 0) return false;
  const stride = Math.max(1, route.length / QUALIFY_SAMPLE_COUNT);
  let sampled = 0;
  let inside = 0;
  const territoryFeature = asFeature(territory);
  for (let i = 0; i < route.length; i += stride) {
    const p = route[Math.floor(i)];
    sampled++;
    try {
      if (booleanPointInPolygon(point(p), territoryFeature)) inside++;
    } catch {
      // skip malformed sample
    }
  }
  return sampled > 0 && inside / sampled >= QUALIFY_MIN_INSIDE_FRACTION;
}

/** Rough plausibility check: a run's bbox diagonal shouldn't wildly exceed its claimed distance. */
export function routeMatchesDistance(route: Position[], distanceKm: number): boolean {
  if (route.length < 2) return false;
  const b = bbox(lineString(route));
  const diagonalKm = distance(point([b[0], b[1]]), point([b[2], b[3]]), { units: "kilometers" });
  return diagonalKm <= distanceKm * 1.2 + 0.5;
}
