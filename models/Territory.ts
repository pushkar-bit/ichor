import { Schema, model, models } from "mongoose";

const TerritorySchema = new Schema(
  {
    zoneId: { type: Schema.Types.ObjectId, ref: "CampusZone", required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    clanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
    weeklyCalorieScore: { type: Number, default: 0 },
    acquiredAt: { type: Date, default: null },
    lastDefended: { type: Date, default: null },
    // Fame: how "on the map" this zone is, independent of who currently owns it.
    // fameScore = distinctRunnerIds.length * 10 + totalVisits — runners matter more than
    // repeat visits from the same person (that's what makes a zone feel genuinely popular).
    fameScore: { type: Number, default: 0 },
    distinctRunnerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    totalVisits: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Territory = models.Territory || model("Territory", TerritorySchema);
