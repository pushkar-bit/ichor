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
// Bbox overlap candidates: find territories whose box could intersect a run's box.
TerritorySchema.index({ "bbox.0": 1, "bbox.2": 1 });

export const Territory = models.Territory || model("Territory", TerritorySchema);
