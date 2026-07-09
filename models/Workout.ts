import { Schema, model, models } from "mongoose";

const WorkoutSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceType: {
      type: String,
      enum: ["HEALTH_SYNC", "OCR_SCREENSHOT", "MANUAL"],
      default: "MANUAL",
    },
    activityType: { type: String, enum: ["RUN", "WALK", "CYCLE"], required: true },
    distanceKm: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    avgPaceMinPerKm: { type: Number, default: null },
    caloriesBurned: { type: Number, required: true },
    heartRateAvg: { type: Number, default: null },
    workoutDate: { type: Date, required: true },
    externalId: { type: String, default: null },
    screenshotUrl: { type: String, default: null },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FLAGGED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

WorkoutSchema.index({ userId: 1, workoutDate: -1 }); // user history queries
WorkoutSchema.index({ activityType: 1 }); // activity-type aggregation
// `externalId` defaults to null (not absent) for MANUAL/OCR_SCREENSHOT workouts, and a plain
// `sparse` index still treats an explicit null as "present" — so a `sparse` unique index here
// would wrongly reject a user's second manually-logged workout. A partial filter that only
// indexes real string externalIds sidesteps that entirely (see models/User.ts for the same
// footgun previously hit on `username`).
WorkoutSchema.index(
  { userId: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } },
); // dedup synced imports (e.g. Strava)

export const Workout = models.Workout || model("Workout", WorkoutSchema);
