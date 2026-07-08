import { Schema, model, models } from "mongoose";

const PostSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", required: true, unique: true },
    caption: { type: String, default: "" },
    photoUrls: [{ type: String }],
    locationZoneId: { type: Schema.Types.ObjectId, ref: "CampusZone", default: null },
    isPublic: { type: Boolean, default: true },
    hypeCount: { type: Number, default: 0 },
    hypeUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    respectCount: { type: Number, default: 0 },
    respectUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    challengeCount: { type: Number, default: 0 },
    challengeUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    flagCount: { type: Number, default: 0 },
    flaggedByUserIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ isPublic: 1, isHidden: 1, createdAt: -1 }); // main feed query
PostSchema.index({ userId: 1, isHidden: 1, createdAt: -1 }); // per-user posts
PostSchema.index({ isPublic: 1, isHidden: 1, hypeCount: -1, respectCount: -1 }); // top-today sort

export const Post = models.Post || model("Post", PostSchema);
