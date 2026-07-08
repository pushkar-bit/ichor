import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";
import { Post } from "@/models/Post";
import "@/models/Workout";
import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { computeAllScoresForRange, type DateRange } from "@/lib/scoring";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "@/lib/week";

type RangeKey = "week" | "month" | "all";

function resolveRange(rangeKey: RangeKey): DateRange {
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
      const zonesHeld = await Territory.countDocuments({ clanId: clan._id });
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ category: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { category } = await params;
  const rangeParam = req.nextUrl.searchParams.get("range");
  const rangeKey: RangeKey = rangeParam === "month" || rangeParam === "all" ? rangeParam : "week";
  const range = resolveRange(rangeKey);

  if (category === "calories" || category === "distance") {
    const sorted = await caloriesOrDistanceRows(category, range);
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "pace") {
    const sorted = await bestPaceRows(range);
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "streak") {
    const sorted = await streakRows(range);
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "integrity") {
    const sorted = await integrityRows(range);
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "clans") {
    const rows = await clanRows(range);
    return NextResponse.json({ rows: rows.sort((a, b) => b.value - a.value), me: me?.clanId ? String(me.clanId) : null });
  }

  return NextResponse.json({ error: "unknown category" }, { status: 404 });
}
