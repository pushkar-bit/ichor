import { Schema, model, models } from "mongoose";

const AttackSchema = new Schema(
  {
    attackerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    defenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: "CampusZone", required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "WAR", "FORFEITED", "RESOLVED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    type: { type: String, enum: ["STAT", "SPRINT"], default: "STAT" },
    attackerScore: { type: Number, default: 0 },
    defenderScore: { type: Number, default: 0 },
    /** The specific run (Workout) that triggered this attack — gets the 1.5x fresh-run bonus. */
    attackRunId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
    /** Set once the defender chooses "War" instead of "Defend". */
    warGroupRunId: { type: Schema.Types.ObjectId, ref: "GroupRun", default: null },
    resolution: { type: String, enum: ["ATTACKER_WIN", "DEFENDER_WIN", null], default: null },
    /** 48h from creation — the challengeExpiry job auto-forfeits to the attacker past this. */
    expiresAt: { type: Date, default: null, index: true },
    scheduledAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    winnerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const Attack = models.Attack || model("Attack", AttackSchema);
