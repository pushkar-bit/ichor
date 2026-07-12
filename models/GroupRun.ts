import { Schema, model, models } from "mongoose";

const GroupRunSchema = new Schema(
  {
    title: { type: String, required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionCode: { type: String, required: true, unique: true },
    type: { type: String, enum: ["COMPETITIVE", "FRIENDLY"], default: "FRIENDLY" },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    startAt: { type: Date, required: true },
    /** startAt + 30 minutes — the auto-capture window closes here. */
    windowEnd: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    status: { type: String, enum: ["LOBBY", "WINDOW_OPEN", "COMPLETED"], default: "LOBBY", index: true },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        joinedAt: { type: Date, default: Date.now },
        runId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
      },
    ],
    results: {
      leaderboard: [
        {
          rank: Number,
          userId: { type: Schema.Types.ObjectId, ref: "User" },
          distanceKm: Number,
          avgPaceMinPerKm: Number,
          caloriesBurned: Number,
          runScore: Number,
        },
      ],
      groupStats: {
        totalDistanceKm: Number,
        avgPaceMinPerKm: Number,
        totalCalories: Number,
        fastestUserId: { type: Schema.Types.ObjectId, ref: "User" },
        longestUserId: { type: Schema.Types.ObjectId, ref: "User" },
        topCaloriesUserId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

GroupRunSchema.index({ status: 1, startAt: 1 });

export const GroupRun = models.GroupRun || model("GroupRun", GroupRunSchema);
