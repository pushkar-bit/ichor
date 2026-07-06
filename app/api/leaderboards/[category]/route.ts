import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";
import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { computeAllWeeklyScores } from "@/lib/scoring";
import { addScore, getLeaderboard } from "@/lib/redis";
import { weekKey } from "@/lib/week";

async function caloriesOrDistanceRows(category: "calories" | "distance") {
  const redisKey = `lb:${category}:${weekKey()}`;
  const cached = await getLeaderboard(redisKey, 50);

  if (cached.length > 0) {
    const users = await User.find({ _id: { $in: cached.map((c) => c.member) } }).lean();
    const byId = new Map(users.map((u: any) => [String(u._id), u]));
    return cached
      .filter((c) => byId.has(c.member))
      .map((c) => ({
        userId: c.member,
        name: byId.get(c.member).name,
        avatarUrl: byId.get(c.member).avatarUrl,
        value: c.score,
        unit: category === "calories" ? "pts" : "km",
      }));
  }

  // Cache miss (first read this week) — compute from MongoDB (source of truth) and populate Redis.
  const rows = await computeAllWeeklyScores();
  await Promise.all(
    rows.map((r) =>
      addScore(redisKey, String(r.user._id), category === "calories" ? r.score.finalScore : r.score.totalDistanceKm),
    ),
  );
  const sorted =
    category === "calories"
      ? rows.sort((a, b) => b.score.finalScore - a.score.finalScore)
      : rows.sort((a, b) => b.score.totalDistanceKm - a.score.totalDistanceKm);
  return sorted.map((r) => ({
    userId: String(r.user._id),
    name: r.user.name,
    avatarUrl: r.user.avatarUrl,
    value: category === "calories" ? r.score.finalScore : r.score.totalDistanceKm,
    unit: category === "calories" ? "pts" : "km",
  }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ category: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { category } = await params;

  if (category === "calories" || category === "distance") {
    const sorted = await caloriesOrDistanceRows(category);
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "pace") {
    const rows = await computeAllWeeklyScores();
    const sorted = rows
      .filter((r) => r.score.avgPaceMinPerKm !== null)
      .sort((a, b) => (a.score.avgPaceMinPerKm ?? 999) - (b.score.avgPaceMinPerKm ?? 999))
      .map((r) => ({
        userId: String(r.user._id),
        name: r.user.name,
        avatarUrl: r.user.avatarUrl,
        value: r.score.avgPaceMinPerKm,
        unit: "min/km",
      }));
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "streak") {
    const users = await User.find({}).sort({ streakDays: -1 }).limit(50).lean();
    return NextResponse.json({
      rows: users.map((u: any) => ({ userId: String(u._id), name: u.name, avatarUrl: u.avatarUrl, value: u.streakDays, unit: "days" })),
      me: me ? String(me._id) : null,
    });
  }

  if (category === "integrity") {
    const users = await User.find({}).sort({ integrityPoints: -1 }).limit(50).lean();
    return NextResponse.json({
      rows: users.map((u: any) => ({ userId: String(u._id), name: u.name, avatarUrl: u.avatarUrl, value: u.integrityPoints, unit: "pts" })),
      me: me ? String(me._id) : null,
    });
  }

  if (category === "clans") {
    const clans = await Clan.find({}).lean();
    const allScores = await computeAllWeeklyScores();
    const rows = await Promise.all(
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
    return NextResponse.json({ rows: rows.sort((a, b) => b.value - a.value), me: me?.clanId ? String(me.clanId) : null });
  }

  return NextResponse.json({ error: "unknown category" }, { status: 404 });
}
