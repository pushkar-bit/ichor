import { Schema, model, models } from "mongoose";

const PostSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", required: true, unique: true },
    caption: { type: String, default: "" },
    photoUrls: [{ type: String }],
    locationZoneId: { type: Schema.Types.ObjectId, ref: "CampusZone", default: null },
    isPublic: { type: Boolean, default: true },
    avgFlameRating: { type: Number, default: 0 },
    flameCount: { type: Number, default: 0 },
    kudosCount: { type: Number, default: 0 },
    kudosUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    flagCount: { type: Number, default: 0 },
    flaggedByUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PostSchema.index({ createdAt: -1 });

export const Post = models.Post || model("Post", PostSchema);
