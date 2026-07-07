import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    username: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]{3,20}$/,
    },
    avatarUrl: { type: String, default: "" },
    avatarIsCustom: { type: Boolean, default: false },
    bio: { type: String, default: "" },
    weightKg: { type: Number, default: null },
    heightCm: { type: Number, default: null },
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

if (models.User) {
  delete models.User;
}

export const User = model("User", UserSchema);
