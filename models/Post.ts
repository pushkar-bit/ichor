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
    /**
     * Set when this post's location lands in a zone owned by someone else at the moment
     * of posting. Drives the scoring adjustments below — see lib/scoring.ts.
     */
    contestStatus: {
      type: String,
      enum: ["NONE", "ATTACKED", "EXPLOITED", "ATTACK_WON", "ATTACK_LOST", "WAR_SCHEDULED", "WAR_WON", "WAR_LOST"],
      default: "NONE",
    },
    /** Applied to this post's calorie contribution in scoring: 0.5 for exploit, 0 for a lost attack. */
    scoreMultiplier: { type: Number, default: 1 },
    /** Flat bonus added on top (200 for a won attack, 300 for a won war). */
    battleBonusPoints: { type: Number, default: 0 },
    linkedAttackId: { type: Schema.Types.ObjectId, ref: "Attack", default: null },
    groupRunId: { type: Schema.Types.ObjectId, ref: "GroupRun", default: null },
  },
  { timestamps: true },
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ isPublic: 1, isHidden: 1, createdAt: -1 }); // main feed query
PostSchema.index({ userId: 1, isHidden: 1, createdAt: -1 }); // per-user posts
PostSchema.index({ isPublic: 1, isHidden: 1, hypeCount: -1, respectCount: -1 }); // top-today sort

export const Post = models.Post || model("Post", PostSchema);
