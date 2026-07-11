import crypto from "crypto";
import { GroupRun } from "@/models/GroupRun";
import { Attack } from "@/models/Attack";
import { resolveWar } from "./territory";

const WINDOW_MINUTES = 30;
/** Gives both sides time to see the notification and join the lobby before the run starts. */
const LOBBY_LEAD_MINUTES = 10;

function generateSessionCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

/** Defender chose "War" instead of "Defend" — spins up a linked GroupRun both sides run into. */
export async function createWarGroupRun(params: { attackId: string; hostId: string; zoneId: string }) {
  const { attackId, hostId, zoneId } = params;
  const startAt = new Date(Date.now() + LOBBY_LEAD_MINUTES * 60 * 1000);
  const windowEnd = new Date(startAt.getTime() + WINDOW_MINUTES * 60 * 1000);

  let sessionCode = generateSessionCode();
  // Collision is extremely unlikely at 16^6 codes, but the unique index would 500 the
  // request outright rather than retry on its own.
  while (await GroupRun.exists({ sessionCode })) sessionCode = generateSessionCode();

  return GroupRun.create({
    title: "Territory War",
    hostId,
    sessionCode,
    type: "WAR",
    linkedAttackId: attackId,
    territoryId: zoneId,
    startAt,
    windowEnd,
    status: "LOBBY",
    participants: [{ userId: hostId, joinedAt: new Date() }],
  });
}

export async function joinGroupRun(groupRunId: string, userId: string) {
  const groupRun = await GroupRun.findById(groupRunId);
  if (!groupRun || groupRun.status === "COMPLETED") return null;
  const already = groupRun.participants.some((p: { userId: unknown }) => String(p.userId) === String(userId));
  if (!already) {
    groupRun.participants.push({ userId, joinedAt: new Date() });
    await groupRun.save();
  }
  return groupRun;
}

/** The group run (if any) a user's just-posted workout should auto-link to: they must be a
 * participant without a run yet, and the workout must land inside the capture window. */
export async function findActiveGroupRunForUser(userId: string, workoutDate: Date) {
  return GroupRun.findOne({
    participants: { $elemMatch: { userId, runId: null } },
    status: { $in: ["LOBBY", "WINDOW_OPEN"] },
    startAt: { $lte: workoutDate },
    windowEnd: { $gte: workoutDate },
  });
}

export async function attachRunToGroupRun(groupRunId: string, userId: string, workoutId: string) {
  await GroupRun.updateOne(
    { _id: groupRunId, "participants.userId": userId },
    { $set: { "participants.$.runId": workoutId, status: "WINDOW_OPEN" } },
  );
}

/** Closes a window past its end: builds the leaderboard from each participant's linked run
 * and, for WAR runs, resolves the underlying Attack by directly comparing calorie totals —
 * the group run itself is the fair fight, so no fresh-run/pace bonuses apply here. */
export async function closeGroupRun(groupRunId: string) {
  const groupRun = await GroupRun.findById(groupRunId).populate("participants.runId");
  if (!groupRun || groupRun.status === "COMPLETED") return groupRun;

  type LeaderboardEntry = {
    userId: unknown;
    distanceKm: number;
    avgPaceMinPerKm: number | null;
    caloriesBurned: number;
    runScore: number;
  };
  type RankedEntry = LeaderboardEntry & { rank: number };

  const withRuns = groupRun.participants.filter((p: { runId: unknown }) => p.runId);
  const unranked: LeaderboardEntry[] = withRuns.map((p: { userId: unknown; runId: any }) => ({
    userId: p.userId,
    distanceKm: p.runId.distanceKm as number,
    avgPaceMinPerKm: p.runId.avgPaceMinPerKm as number | null,
    caloriesBurned: p.runId.caloriesBurned as number,
    runScore: p.runId.caloriesBurned as number,
  }));
  const leaderboard: RankedEntry[] = unranked
    .sort((a, b) => b.runScore - a.runScore)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  const totalDistanceKm = leaderboard.reduce((s, l) => s + (l.distanceKm || 0), 0);
  const totalCalories = leaderboard.reduce((s, l) => s + (l.caloriesBurned || 0), 0);
  const paceEntries = leaderboard.filter((l) => l.avgPaceMinPerKm);
  const avgPaceMinPerKm = paceEntries.length
    ? paceEntries.reduce((s, l) => s + (l.avgPaceMinPerKm ?? 0), 0) / paceEntries.length
    : null;

  const fastest = [...leaderboard].filter((l) => l.avgPaceMinPerKm).sort((a, b) => (a.avgPaceMinPerKm ?? 0) - (b.avgPaceMinPerKm ?? 0))[0];
  const longest = [...leaderboard].sort((a, b) => b.distanceKm - a.distanceKm)[0];
  const topCalories = leaderboard[0];

  groupRun.status = "COMPLETED";
  groupRun.endedAt = new Date();
  groupRun.results = {
    leaderboard,
    groupStats: {
      totalDistanceKm,
      avgPaceMinPerKm,
      totalCalories,
      fastestUserId: fastest?.userId ?? null,
      longestUserId: longest?.userId ?? null,
      topCaloriesUserId: topCalories?.userId ?? null,
    },
  };
  await groupRun.save();

  if (groupRun.type === "WAR" && groupRun.linkedAttackId) {
    const attack = await Attack.findById(groupRun.linkedAttackId);
    if (attack) {
      const attackerEntry = leaderboard.find((l) => String(l.userId) === String(attack.attackerId));
      const defenderEntry = leaderboard.find((l) => String(l.userId) === String(attack.defenderId));
      const attackerTotal = attackerEntry?.runScore ?? 0;
      const defenderTotal = defenderEntry?.runScore ?? 0;
      // No-show default: if neither side actually logged a run, the defender keeps the zone.
      const winnerId = attackerTotal > defenderTotal ? attack.attackerId : attack.defenderId;
      await resolveWar(String(attack._id), String(winnerId));
    }
  }

  return groupRun;
}

/** Closes every window that's expired but never got closed (called by a scheduled job). */
export async function closeExpiredGroupRuns() {
  const expired = await GroupRun.find({
    status: { $in: ["LOBBY", "WINDOW_OPEN"] },
    windowEnd: { $lt: new Date() },
  }).select("_id");
  const results = [];
  for (const g of expired) {
    results.push(await closeGroupRun(String(g._id)));
  }
  return results;
}
