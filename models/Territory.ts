import { Schema, model, models } from "mongoose";

const TerritorySchema = new Schema(
  {
    zoneId: { type: Schema.Types.ObjectId, ref: "CampusZone", required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    clanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
    weeklyCalorieScore: { type: Number, default: 0 },
    acquiredAt: { type: Date, default: null },
    lastDefended: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Territory = models.Territory || model("Territory", TerritorySchema);
