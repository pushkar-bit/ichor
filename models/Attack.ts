import { Schema, model, models } from "mongoose";

const AttackSchema = new Schema(
  {
    attackerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    defenderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: "CampusZone", required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "FORFEITED", "RESOLVED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    type: { type: String, enum: ["STAT", "SPRINT"], default: "STAT" },
    attackerScore: { type: Number, default: 0 },
    defenderScore: { type: Number, default: 0 },
    scheduledAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    winnerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const Attack = models.Attack || model("Attack", AttackSchema);
