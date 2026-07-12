import { Schema, model, models, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    username: {
      type: String,
      // No `default: null` — a sparse unique index still counts an explicit null as
      // "present", so every new signup would occupy that one null slot and block every
      // signup after it (this is exactly what happened: first with the old clerkId index,
      // now with this one). Leaving the field genuinely absent until onboarding sets it is
      // what sparse actually needs to exclude un-onboarded users from the uniqueness check.
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
    // Spent automatically to bridge a single missed day instead of resetting the streak —
    // see lib/recordWorkout.ts. Starts with one freebie; replenished on weekly milestones.
    streakFreezesAvailable: { type: Number, default: 1 },
    /** Territory-game profile points — materialized sum of PointsLedger rows, floored at 0. */
    points: { type: Number, default: 0 },
    integrityPoints: { type: Number, default: 0 },
    battlesWon: { type: Number, default: 0 },
    battlesLost: { type: Number, default: 0 },
    clanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    badges: [{ type: String }],
    lastPostDate: { type: Date, default: null },
    fcmToken: { type: String, default: null },
    stravaAthleteId: { type: String, default: null, index: true },
    stravaAccessToken: { type: String, default: null },
    stravaRefreshToken: { type: String, default: null },
    stravaTokenExpiresAt: { type: Date, default: null },
    stravaConnectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User = models.User || model("User", UserSchema);
