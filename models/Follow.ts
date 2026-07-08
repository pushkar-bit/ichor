import { Schema, model, models } from "mongoose";

const FollowSchema = new Schema(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    followingId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = models.Follow || model("Follow", FollowSchema);
