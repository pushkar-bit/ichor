import { Schema, model, models } from "mongoose";

const CoachMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "coach"], required: true },
    text: { type: String, required: true },
  },
  { timestamps: true },
);

export const CoachMessage = models.CoachMessage || model("CoachMessage", CoachMessageSchema);
