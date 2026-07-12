import { Schema, model, models } from "mongoose";

export const NOTIFICATION_TYPES = [
  "TERRITORY_CLAIMED",
  "TERRITORY_SPLIT",
  "ATTACK_INCOMING", // you're being attacked — respond
  "ATTACK_OPPORTUNITY", // your run covered ≥40% of someone's land — attack?
  "BATTLE_ACCEPTED",
  "OPPONENT_SUBMITTED", // deliberately stat-free (fog of war)
  "BATTLE_RESOLVED",
  "DUEL_SCHEDULED",
  "POINTS_AWARDED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** In-app inbox item. v1 is polling-only — no push (fcmToken stays unused). */
const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    data: {
      battleId: { type: Schema.Types.ObjectId, ref: "Battle", default: null },
      territoryId: { type: Schema.Types.ObjectId, ref: "Territory", default: null },
      workoutId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification = models.Notification || model("Notification", NotificationSchema);
