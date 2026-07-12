import { Schema, model, models } from "mongoose";

export const POINT_REASONS = [
  // Per-run awards (lib/points.ts)
  "THRESHOLD_5K",
  "THRESHOLD_10K",
  "THRESHOLD_15K",
  "THRESHOLD_HALF",
  "THRESHOLD_30K",
  "THRESHOLD_FULL",
  "PB_5K",
  "PB_10K",
  "PB_LONGEST",
  "PACE_BAND",
  // Battle deltas (lib/battles.ts)
  "REFUSAL_BETTER",
  "REFUSAL_WORSE",
  "DUEL_DOUBLE_FORFEIT",
  "ASYNC_DOUBLE_FORFEIT",
  "BATTLE_WIN",
  "BATTLE_STAT_PENALTY",
] as const;

export type PointReason = (typeof POINT_REASONS)[number];

/**
 * Every profile-point change, one row each, with a caller-built `uniqueKey` (e.g.
 * "wk:<workoutId>:PB_5K") enforced unique — replayed webhooks and double-fired hooks
 * can't double-award by construction. `User.points` is the materialized sum.
 */
const PointsLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true }, // positive = award, negative = deduction
    reason: { type: String, enum: POINT_REASONS, required: true },
    uniqueKey: { type: String, required: true, unique: true },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
    battleId: { type: Schema.Types.ObjectId, ref: "Battle", default: null },
    territoryId: { type: Schema.Types.ObjectId, ref: "Territory", default: null },
  },
  { timestamps: true },
);

PointsLedgerSchema.index({ userId: 1, createdAt: -1 });

export const PointsLedger = models.PointsLedger || model("PointsLedger", PointsLedgerSchema);
