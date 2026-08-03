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
  // Upkeep (lib/territoryUpkeep.ts)
  "TERRITORY_FADING", // nobody's run your land in a while — it's losing value
  "TERRITORY_DORMANT", // it went neutral; anyone can claim it now
  "HOLD_STREAK", // you've held this land N days
  // Raids (lib/raids.ts) — the low-ceremony attack
  "RAID_LOST", // someone out-ran your claim and carved off a strip
  "RAID_WON",
  // Objectives (lib/objectives.ts)
  "OBJECTIVE_COMPLETE",
  // Land war (lib/landWar.ts)
  "LAND_WAR_OPEN",
  "LAND_WAR_RESULT",
  // Social — the everyday reasons to open the app, which the inbox previously ignored
  // entirely (it only ever carried territory events).
  "FOLLOW",
  "POST_REACTION",
  "POST_COMMENT",
  "COMMENT_REPLY",
  "CLAN_JOIN",
  "GROUP_RUN_JOIN",
  // Birthday wish (lib/birthday.ts) — deduped per user per year via the dedupeKey unique index.
  "BIRTHDAY",
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
      postId: { type: Schema.Types.ObjectId, ref: "Post", default: null },
      commentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
      clanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null },
      groupRunId: { type: Schema.Types.ObjectId, ref: "GroupRun", default: null },
      /** Who caused this. Populated on read so the inbox can link to their profile. */
      actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    /**
     * Optional idempotency guard, same pattern as PointsLedger.uniqueKey. Social events are
     * toggleable — unreact and react again, unfollow and refollow — and without this each
     * toggle would ring the other person's bell. Callers that can spam build a key; the ones
     * that fire once (a battle resolving) leave it unset.
     */
    dedupeKey: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
// Partial (not sparse) so the many rows with an explicit null dedupeKey don't collide —
// same footgun documented on Workout.externalId and User.username.
NotificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } },
);

export const Notification = models.Notification || model("Notification", NotificationSchema);
