import { Schema, model, models } from "mongoose";

/**
 * A timeboxed clan-vs-clan contest: whichever clan's members collectively run more km
 * between `startedAt` and `endsAt` wins. Resolution reads Workout.distanceKm for both
 * clans' members in that window — no snapshot needed, the window itself is the scope.
 */
const ClanWarSchema = new Schema(
  {
    clanAId: { type: Schema.Types.ObjectId, ref: "Clan", required: true, index: true },
    clanBId: { type: Schema.Types.ObjectId, ref: "Clan", required: true, index: true },
    declaredById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["ACTIVE", "RESOLVED"], default: "ACTIVE" },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    winnerId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
    clanAKm: { type: Number, default: 0 },
    clanBKm: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ClanWar = models.ClanWar || model("ClanWar", ClanWarSchema);
