import { User } from "@/models/User";
import { Post } from "@/models/Post";
import "@/models/Workout";
import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { PointsLedger } from "@/models/PointsLedger";
import { getTerritoryFameLeaderboard } from "./territoryEngine";
import { computeAllScoresForRange, type DateRange } from "./scoring";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "./week";

export type RangeKey = "week" | "month" | "all";
export type LeaderboardCategory =
  | "calories"
  | "distance"
  | "pace"
  | "streak"
  | "integrity"
  | "clans"
  | "territory"
  | "points"
  | "empire";

export function resolveRange(rangeKey: RangeKey): DateRange {
  const now = new Date();
  if (rangeKey === "week") return { start: startOfWeek(now), end: endOfWeek(now) };
  if (rangeKey === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
  return null;
}

/**
 * Ranks users by their best (lowest) average pace across posted runs within the range.
 * No minimum-run-count gate — earlier versions required 3+ runs in the current week,
 * which left this leaderboard empty in practice.
 */
async function bestPaceRows(range: DateRange) {
  const createdAt: Record<string, Date> = {};
  if (range?.start) createdAt.$gte = range.start;
  if (range?.end) createdAt.$lt = range.end;

  const posts = await Post.find({ isHidden: false, ...(Object.keys(createdAt).length ? { createdAt } : {}) })
    .select("userId workoutId")
    .populate({ path: "workoutId", select: "activityType avgPaceMinPerKm" })
    .lean();
  const bestByUser = new Map<string, number>();
  for (const p of posts as any[]) {
    const w = p.workoutId;
    if (!w || w.activityType !== "RUN" || !w.avgPaceMinPerKm) continue;
    const uid = String(p.userId);
    const best = bestByUser.get(uid);
    if (best === undefined || w.avgPaceMinPerKm < best) bestByUser.set(uid, w.avgPaceMinPerKm);
  }
  if (bestByUser.size === 0) return [];

  const users = await User.find({ _id: { $in: [...bestByUser.keys()] } }).select("name username avatarUrl").lean();
  return users
    .map((u: any) => ({
      userId: String(u._id),
      username: u.username ?? null,
      name: u.name,
      avatarUrl: u.avatarUrl,
      value: bestByUser.get(String(u._id))!,
      unit: "min/km",
    }))
    .sort((a, b) => a.value - b.value);
}

async function caloriesOrDistanceRows(category: "calories" | "distance", range: DateRange) {
  const rows = await computeAllScoresForRange(range);
  const sorted =
    category === "calories"
      ? rows.sort((a, b) => b.score.finalScore - a.score.finalScore)
      : rows.sort((a, b) => b.score.totalDistanceKm - a.score.totalDistanceKm);
  return sorted.map((r) => ({
    userId: String(r.user._id),
    username: r.user.username ?? null,
    name: r.user.name,
    avatarUrl: r.user.avatarUrl,
    value: category === "calories" ? r.score.finalScore : r.score.totalDistanceKm,
    unit: category === "calories" ? "pts" : "km",
  }));
}

/**
 * All-time ranks by each user's best-ever streak (a real historical record). Week/month
 * don't have a natural "streak" reading for a bounded window, so they rank by number of
 * distinct active days within that window instead — still "grind", just windowed.
 */
async function streakRows(range: DateRange) {
  if (range === null) {
    const users = await User.find({}).sort({ bestStreakDays: -1 }).limit(50).lean();
    return users.map((u: any) => ({
      userId: String(u._id),
      username: u.username ?? null,
      name: u.name,
      avatarUrl: u.avatarUrl,
      value: u.bestStreakDays,
      unit: "day best",
    }));
  }
  const rows = await computeAllScoresForRange(range);
  return rows
    .sort((a, b) => b.score.activeDays - a.score.activeDays)
    .map((r) => ({
      userId: String(r.user._id),
      username: r.user.username ?? null,
      name: r.user.name,
      avatarUrl: r.user.avatarUrl,
      value: r.score.activeDays,
      unit: "days active",
    }));
}

/**
 * All-time ranks by the lifetime integrityPoints counter. Week/month rank by the
 * integrity bonus actually earned within that window (clean diet cards logged then).
 */
async function integrityRows(range: DateRange) {
  if (range === null) {
    const users = await User.find({}).sort({ integrityPoints: -1 }).limit(50).lean();
    return users.map((u: any) => ({
      userId: String(u._id),
      username: u.username ?? null,
      name: u.name,
      avatarUrl: u.avatarUrl,
      value: u.integrityPoints,
      unit: "pts",
    }));
  }
  const rows = await computeAllScoresForRange(range);
  return rows
    .sort((a, b) => b.score.integrityBonus - a.score.integrityBonus)
    .map((r) => ({
      userId: String(r.user._id),
      username: r.user.username ?? null,
      name: r.user.name,
      avatarUrl: r.user.avatarUrl,
      value: r.score.integrityBonus,
      unit: "pts",
    }));
}

/** Zones held is always a live/current count — territory doesn't have a "this week" reading. */
async function clanRows(range: DateRange) {
  const clans = await Clan.find({}).lean();
  const allScores = await computeAllScoresForRange(range);
  return Promise.all(
    clans.map(async (clan: any) => {
      const members = await ClanMember.find({ clanId: clan._id }).lean();
      const memberIds = members.map((m: any) => String(m.userId));
      const combined = allScores
        .filter((r) => memberIds.includes(String(r.user._id)))
        .reduce((s, r) => s + r.score.finalScore, 0);
      const zonesHeld = await Territory.countDocuments({ ownerId: { $in: memberIds } });
      return {
        clanId: String(clan._id),
        name: clan.name,
        tag: clan.tag,
        color: clan.color,
        memberCount: members.length,
        value: combined + zonesHeld * 200,
        zonesHeld,
        unit: "pts",
      };
    }),
  );
}

/**
 * Territories ranked by fame (distinct runners + total visits — see lib/territoryEngine.ts).
 * Unlike the other categories this ignores `range` entirely — fame is a live, cumulative
 * reading, there's no natural "fame this week" split — so every range shows the same ranking.
 */
async function territoryRows() {
  const territories = await getTerritoryFameLeaderboard(50);
  return territories.map((t) => ({
    zoneId: t.territoryId,
    name: t.territoryName,
    avatarUrl: t.ownerAvatarUrl,
    ownerName: t.ownerName,
    value: t.fameScore,
    unit: "fame",
  }));
}

/**
 * All-time ranks by the materialized User.points; week/month sum the ledger entries that
 * landed in that window, so a hot week reads as a hot week even for a long-time player.
 */
async function pointsRows(range: DateRange) {
  if (range === null) {
    const users = await User.find({ points: { $gt: 0 } }).sort({ points: -1 }).limit(50).lean();
    return users.map((u: any) => ({
      userId: String(u._id),
      username: u.username ?? null,
      name: u.name,
      avatarUrl: u.avatarUrl,
      value: u.points,
      unit: "pts",
    }));
  }

  const createdAt: Record<string, Date> = {};
  if (range.start) createdAt.$gte = range.start;
  if (range.end) createdAt.$lt = range.end;
  const entries = await PointsLedger.find({ createdAt }).select("userId amount").lean();
  const byUser = new Map<string, number>();
  for (const e of entries as any[]) {
    const uid = String(e.userId);
    byUser.set(uid, (byUser.get(uid) ?? 0) + e.amount);
  }
  const users = await User.find({ _id: { $in: [...byUser.keys()] } }).select("name username avatarUrl").lean();
  return users
    .map((u: any) => ({
      userId: String(u._id),
      username: u.username ?? null,
      name: u.name,
      avatarUrl: u.avatarUrl,
      value: byUser.get(String(u._id)) ?? 0,
      unit: "pts",
    }))
    .sort((a, b) => b.value - a.value);
}

/** Total land value held right now — a live reading, same for every range. */
async function empireRows() {
  const territories = await Territory.find({}).select("ownerId valuePoints").lean();
  const byOwner = new Map<string, { value: number; count: number }>();
  for (const t of territories as any[]) {
    const uid = String(t.ownerId);
    const cur = byOwner.get(uid) ?? { value: 0, count: 0 };
    cur.value += t.valuePoints ?? 0;
    cur.count += 1;
    byOwner.set(uid, cur);
  }
  const users = await User.find({ _id: { $in: [...byOwner.keys()] } }).select("name username avatarUrl").lean();
  return users
    .map((u: any) => {
      const stats = byOwner.get(String(u._id))!;
      return {
        userId: String(u._id),
        username: u.username ?? null,
        name: u.name,
        avatarUrl: u.avatarUrl,
        value: stats.value,
        territories: stats.count,
        unit: "pts of land",
      };
    })
    .sort((a, b) => b.value - a.value);
}

export async function getLeaderboardRows(category: string, rangeKey: RangeKey, viewer: { _id: unknown; clanId?: unknown } | null) {
  const range = resolveRange(rangeKey);

  if (category === "calories" || category === "distance") {
    const sorted = await caloriesOrDistanceRows(category, range);
    return { rows: sorted.slice(0, 50), me: viewer ? String(viewer._id) : null };
  }
  if (category === "pace") {
    const sorted = await bestPaceRows(range);
    return { rows: sorted.slice(0, 50), me: viewer ? String(viewer._id) : null };
  }
  if (category === "streak") {
    const sorted = await streakRows(range);
    return { rows: sorted.slice(0, 50), me: viewer ? String(viewer._id) : null };
  }
  if (category === "integrity") {
    const sorted = await integrityRows(range);
    return { rows: sorted.slice(0, 50), me: viewer ? String(viewer._id) : null };
  }
  if (category === "clans") {
    const rows = await clanRows(range);
    return { rows: rows.sort((a, b) => b.value - a.value), me: viewer?.clanId ? String(viewer.clanId) : null };
  }
  if (category === "territory") {
    const rows = await territoryRows();
    return { rows, me: null };
  }
  if (category === "points") {
    const sorted = await pointsRows(range);
    return { rows: sorted.slice(0, 50), me: viewer ? String(viewer._id) : null };
  }
  if (category === "empire") {
    const sorted = await empireRows();
    return { rows: sorted.slice(0, 50), me: viewer ? String(viewer._id) : null };
  }
  return null;
}
