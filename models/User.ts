import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    totalDistanceKm: { type: Number, default: 0 },
    totalWorkouts: { type: Number, default: 0 },
    totalCalories: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    bestStreakDays: { type: Number, default: 0 },
    integrityPoints: { type: Number, default: 0 },
    battlesWon: { type: Number, default: 0 },
    battlesLost: { type: Number, default: 0 },
    clanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
    badges: [{ type: String }],
    lastPostDate: { type: Date, default: null },
    fcmToken: { type: String, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = models.User || model("User", UserSchema);
