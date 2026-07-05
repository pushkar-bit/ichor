import { Schema, model, models } from "mongoose";

const FlameRatingSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true },
);

FlameRatingSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const FlameRating = models.FlameRating || model("FlameRating", FlameRatingSchema);
