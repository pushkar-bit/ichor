import { GroupRun } from "@/models/GroupRun";

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

/** Closes a window past its end: builds the leaderboard from each participant's linked run. */
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
