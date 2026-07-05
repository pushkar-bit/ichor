import { Schema, model, models } from "mongoose";

const ClanSchema = new Schema(
  {
    name: { type: String, required: true },
    tag: { type: String, required: true, unique: true, uppercase: true, minlength: 4, maxlength: 4 },
    leaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    color: { type: String, default: "#AE93F4" },
    dietPactDescription: { type: String, default: "" },
    battlesWon: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const ClanMemberSchema = new Schema(
  {
    clanId: { type: Schema.Types.ObjectId, ref: "Clan", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["LEADER", "MEMBER"], default: "MEMBER" },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
ClanMemberSchema.index({ clanId: 1, userId: 1 }, { unique: true });

export const Clan = models.Clan || model("Clan", ClanSchema);
export const ClanMember = models.ClanMember || model("ClanMember", ClanMemberSchema);
