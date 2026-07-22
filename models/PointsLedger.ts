import { Schema, model, models } from "mongoose";

export const POINT_REASONS = [
  // Per-run awards (lib/points.ts)
  "BASE_ACTIVITY",
  "DISTANCE_BONUS",
  "PACE_BONUS_FAST",
  "PACE_BONUS_MID",
  "PACE_BONUS_SLOW",
  "DAILY_FIRST_POST",
  "STREAK_7",
  "STREAK_30",
  "THRESHOLD_5K",
  "THRESHOLD_10K",
  "THRESHOLD_15K",
  "THRESHOLD_HALF",
  "THRESHOLD_30K",
  "THRESHOLD_FULL",
  "PB_5K",
  "PB_10K",
  "PB_LONGEST",
  // Diet card awards (app/api/posts/route.ts)
  "DIET_CLEAN",
  "DIET_NEUTRAL",
  // Territory deltas (lib/territoryEngine.ts)
  "TERRITORY_CREATED",
  "TERRITORY_VALUE_GROWTH",
  "TERRITORY_HOLD_WEEKLY",
  "TERRITORY_LEADERBOARD_1",
  "TERRITORY_LEADERBOARD_2",
  "TERRITORY_LEADERBOARD_3",
  // Battle deltas (lib/battles.ts)
  "ATTACK_WIN",
  "WAR_WIN",
  "DEFEND_WIN",
  "ATTACK_LOSS",
  "TERRITORY_LOST",
  "REFUSAL_BETTER",
  "REFUSAL_WORSE",
  "OWNERSHIP_DIVIDED_2",
  "OWNERSHIP_DIVIDED_3",
  "DUEL_DOUBLE_FORFEIT",
  "ASYNC_DOUBLE_FORFEIT",
  "BATTLE_WIN",
  "BATTLE_STAT_PENALTY",
  // Leaderboard deltas (lib/points.ts sweeps)
  "RANK_IMPROVEMENT_SMALL",
  "RANK_IMPROVEMENT_MID",
  "RANK_IMPROVEMENT_LARGE",
  "RANK_1_WEEKLY",
  "RANK_2_WEEKLY",
  "RANK_3_WEEKLY",
] as const;

export type PointReason = (typeof POINT_REASONS)[number];

/**
 * Every profile-point change, one row each, with a caller-built `uniqueKey` (e.g.
 * "wk:<workoutId>:PB_5K") enforced unique — replayed webhooks and double-fired hooks
 * can't double-award by construction. `User.points` is the materialized sum.
 */
const PointsLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true }, // positive = award, negative = deduction
    reason: { type: String, enum: POINT_REASONS, required: true },
    uniqueKey: { type: String, required: true, unique: true },
    workoutId: { type: Schema.Types.ObjectId, ref: "Workout", default: null },
    battleId: { type: Schema.Types.ObjectId, ref: "Battle", default: null },
    territoryId: { type: Schema.Types.ObjectId, ref: "Territory", default: null },
  },
  { timestamps: true },
);

PointsLedgerSchema.index({ userId: 1, createdAt: -1 });

export const PointsLedger = models.PointsLedger || model("PointsLedger", PointsLedgerSchema);
