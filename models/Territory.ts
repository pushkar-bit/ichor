import { Schema, model, models } from "mongoose";

/**
 * A run-shaped piece of claimed land. Born from the first run through unclaimed ground,
 * named after (and colored by) its claimer, worth `valuePoints` to whoever holds it.
 *
 * `geometry` is deliberately NOT 2dsphere-indexed: Mongo validates indexed polygons
 * strictly and buffered/differenced GPS shapes can't be guaranteed perfect. The indexable
 * parts live in `bbox` (overlap candidate lookup) and `centroid` (map centering) — exact
 * geometry math happens in lib/geo.ts with turf.
 *
 * Fog of war: `claimRunId`/`claimStats` describe the run that earned the land and must
 * NEVER be serialized to anyone but the owner (enforced at the API layer).
 */
const TerritorySchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    color: { type: String, required: true },
    geometry: { type: Schema.Types.Mixed, required: true }, // GeoJSON Polygon | MultiPolygon
    bbox: { type: [Number], required: true }, // [minLng, minLat, maxLng, maxLat]
    centroid: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    areaSqM: { type: Number, required: true },
    valuePoints: { type: Number, default: 1000 },
    /**
     * The highest value this land has ever held. Upkeep decay writes valuePoints down from
     * here and recovery climbs back toward it, so a territory that's neglected and then
     * revived returns to the standing it earned rather than starting over.
     */
    peakValuePoints: { type: Number, default: 1000 },
    /**
     * Where this land is, resolved once at claim time from the same reverse-geocode call
     * that names it. Denormalized (rather than re-geocoded per read) because district
     * standings aggregate over every territory — see lib/districts.ts.
     */
    district: { type: String, default: null, index: true },
    city: { type: String, default: null },
    /**
     * When the CURRENT owner took this land — reset on every transfer/split, so
     * `now - heldSince` is the hold streak. See lib/territoryUpkeep.ts.
     */
    heldSince: { type: Date, default: Date.now },
    /** Highest hold-streak milestone (in days) already paid out, so a sweep can't double-pay. */
    holdMilestoneDays: { type: Number, default: 0 },
    /**
     * Last time ANY run credited this land (the same event that bumps fame). Upkeep decay is
     * measured from here: land nobody runs through goes quiet, then fades. Claiming sets it.
     */
    lastActivityAt: { type: Date, default: Date.now },
    /** The run that claimed this land — fog-of-war protected. */
    claimRunId: { type: Schema.Types.ObjectId, ref: "Workout", required: true },
    claimStats: {
      distanceKm: { type: Number, required: true },
      avgPaceMinPerKm: { type: Number, default: null },
      durationSeconds: { type: Number, required: true },
      workoutDate: { type: Date, required: true },
    },
    /** Set when this territory was born from a refusal split of another. */
    parentTerritoryId: { type: Schema.Types.ObjectId, ref: "Territory", default: null },
    /** No attacks allowed until this passes (post-battle breathing room). */
    shieldUntil: { type: Date, default: null },
    // Fame: how "on the map" this land is, independent of who currently owns it.
    // fameScore = distinctRunnerIds.length * 10 + totalVisits + totalDistanceKm * 10.
    fameScore: { type: Number, default: 0 },
    distinctRunnerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    totalVisits: { type: Number, default: 0 },
    // Cumulative km credited from every run (anyone's, attack or not) whose corridor covered
    // at least DISTANCE_CREDIT_THRESHOLD of this territory — see lib/territoryEngine.ts.
    totalDistanceKm: { type: Number, default: 0 },
  },
  { timestamps: true },
);

TerritorySchema.index({ centroid: "2dsphere" });
// Upkeep sweep: find the quietest land first (see lib/territoryUpkeep.ts).
TerritorySchema.index({ lastActivityAt: 1 });
// Bbox overlap candidates: find territories whose box could intersect a run's box.
TerritorySchema.index({ "bbox.0": 1, "bbox.2": 1 });

export const Territory = models.Territory || model("Territory", TerritorySchema);
