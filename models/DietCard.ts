import { Schema, model, models } from "mongoose";

const DietCardSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, unique: true },
    description: { type: String, required: true },
    classification: { type: String, enum: ["CLEAN", "CHEAT", "NEUTRAL"], required: true },
    estimatedCalories: { type: Number, default: null },
    integrityBonus: { type: Number, default: 0 },
    suggestion: { type: String, default: "" },
  },
  { timestamps: true },
);

export const DietCard = models.DietCard || model("DietCard", DietCardSchema);
