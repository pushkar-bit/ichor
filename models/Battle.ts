import { Schema, model, models } from "mongoose";

/**
 * One attack on one territory, through resolution. Fog of war applies end to end: the
 * scores in here (attack run vs claim run vs battle entries) are compared server-side
 * only, and `revealedStats` — written at resolution — is the first time either side
 * sees the other's numbers.
 */
const EntrySchema = new Schema(
  {
    runId: { type: Schema.Types.ObjectId, ref: "Workout", required: true },
    distanceKm: { type: Number, required: true },
    avgPaceMinPerKm: { type: Number, default: null },
    submittedAt: { type: Date, required: true },
  },
  { _id: false },
);

const RevealedSideSchema = new Schema(
  {
    distanceKm: { type: Number, default: null },
    avgPaceMinPerKm: { type: Number, default: null },
    durationSeconds: { type: Number, default: null },
    workoutDate: { type: Date, default: null },
  },
  { _id: false },
);

const BattleSchema = new Schema(
  {
    attackerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    defenderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    territoryId: { type: Schema.Types.ObjectId, ref: "Territory", required: true, index: true },
    /** The run that unlocked this attack (≥40% coverage). */
    attackRunId: { type: Schema.Types.ObjectId, ref: "Workout", required: true },
    /** Buffered corridor snapshot at attack time — the refusal split never re-derives geometry. */
    attackCorridor: { type: Schema.Types.Mixed, required: true },
    coverageRatio: { type: Number, required: true },
    /** Attacker's proposal; also the comparison basis for a refusal split. */
    proposedMetric: { type: String, enum: ["PACE", "DISTANCE"], required: true },
    /** How the defender answered (null while pending). */
    mode: { type: String, enum: ["REFUSED", "ASYNC", "DUEL", null], default: null },
    status: {
      type: String,
      enum: ["PENDING_RESPONSE", "ASYNC_ACTIVE", "DUEL_SCHEDULED", "RESOLVED"],
      default: "PENDING_RESPONSE",
      index: true,
    },
    respondBy: { type: Date, required: true },
    // ASYNC mode
    asyncMetric: { type: String, enum: ["PACE", "DISTANCE", null], default: null },
    asyncDeadline: { type: Date, default: null },
    attackerEntry: { type: EntrySchema, default: null },
    defenderEntry: { type: EntrySchema, default: null },
    // DUEL mode
    duelMetric: { type: String, enum: ["PACE", "DISTANCE", null], default: null },
    duelWindowStart: { type: Date, default: null },
    duelWindowEnd: { type: Date, default: null },
    // Resolution
    resolution: {
      type: String,
      enum: ["ATTACKER_WIN", "DEFENDER_WIN", "SPLIT", "DOUBLE_FORFEIT", null],
      default: null,
    },
    winnerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    /** Written at resolution — the fog-of-war payoff both sides finally get to see. */
    revealedStats: {
      type: new Schema(
        { attacker: RevealedSideSchema, defender: RevealedSideSchema },
        { _id: false },
      ),
      default: null,
    },
    /** Territories created/kept by a refusal split. */
    resultTerritoryIds: [{ type: Schema.Types.ObjectId, ref: "Territory" }],
  },
  { timestamps: true },
);

BattleSchema.index({ status: 1, respondBy: 1 });
BattleSchema.index({ status: 1, asyncDeadline: 1 });
BattleSchema.index({ status: 1, duelWindowEnd: 1 });

export const Battle = models.Battle || model("Battle", BattleSchema);
