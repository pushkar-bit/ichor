import { Schema, model, models } from "mongoose";

/**
 * Idempotency ledger for territory fame. One row per (territory, workout) the first time
 * that run credits fame to that land — the unique compound key means a replayed webhook,
 * a manual re-sync, or `npm run backfill:territory` can never double-count visits or
 * distance the way an unguarded $inc would. Mirrors the PointsLedger uniqueKey pattern.
 */
const FameCreditSchema = new Schema(
  {
    territoryId: { type: Schema.Types.ObjectId, ref: "Territory", required: true },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// One credit per run per territory — the whole point of the collection.
FameCreditSchema.index({ territoryId: 1, workoutId: 1 }, { unique: true });

export const FameCredit = models.FameCredit || model("FameCredit", FameCreditSchema);
