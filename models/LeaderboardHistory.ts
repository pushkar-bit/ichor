import { Schema, model, models } from "mongoose";

const LeaderboardHistorySchema = new Schema(
  {
    week: { type: String, required: true },
    category: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    clanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
    score: { type: Number, required: true },
    rank: { type: Number, required: true },
  },
  { timestamps: true },
);

export const LeaderboardHistory =
  models.LeaderboardHistory || model("LeaderboardHistory", LeaderboardHistorySchema);
