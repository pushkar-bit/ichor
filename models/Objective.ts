import { Schema, model, models } from "mongoose";

/**
 * A staked intention: "this is the land I'm going after next."
 *
 * Claiming is automatic and silent by design — you find out what you took after the fact.
 * An objective is the missing *before*: the runner picks a target, so the run has a stated
 * stake and the payoff has anticipation. Purely motivational — an objective grants no
 * advantage in the claim/raid/battle math, it only records intent and detects completion
 * (see lib/objectives.ts).
 *
 * One open objective per user at a time (enforced by the partial unique index below), so
 * this stays a commitment rather than a wishlist.
 */
const ObjectiveSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** Null for a "claim this empty ground" target, which has no Territory doc yet. */
    territoryId: { type: Schema.Types.ObjectId, ref: "Territory", default: null },
    /** Snapshotted so an expired objective still reads sensibly after the land changes hands. */
    label: { type: String, required: true },
    kind: { type: String, enum: ["CLAIM", "RAID", "DEFEND"], required: true },
    status: { type: String, enum: ["OPEN", "COMPLETED", "EXPIRED", "ABANDONED"], default: "OPEN" },
    /** Objectives are a "next run" promise, not an open-ended goal — they lapse. */
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    completedWorkoutId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
  },
  { timestamps: true },
);

// One open objective per user. Partial so completed/expired history doesn't collide.
ObjectiveSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "OPEN" } },
);

export const Objective = models.Objective || model("Objective", ObjectiveSchema);
