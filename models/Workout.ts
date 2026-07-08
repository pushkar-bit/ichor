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

export const Workout = models.Workout || model("Workout", WorkoutSchema);
