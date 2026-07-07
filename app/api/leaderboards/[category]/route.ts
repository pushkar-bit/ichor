import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";
import { Post } from "@/models/Post";
import "@/models/Workout";
import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { computeAllWeeklyScores } from "@/lib/scoring";

/**
 * Ranks users by their best-ever (lowest) average pace across all posted runs, all-time.
 * The weekly score's avgPaceMinPerKm only counts if a user logged 3+ runs in the *current*
 * calendar week, which left this leaderboard empty in practice — this ranks on each user's
 * best actual data instead, with no minimum-run-count gate.
 */
async function bestPaceRows() {
  const posts = await Post.find({ isHidden: false }).select("userId workoutId").populate("workoutId").lean();
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

async function caloriesOrDistanceRows(category: "calories" | "distance") {
  // Always computed live from MongoDB (source of truth) — a per-week Redis cache used to be
  // read here, but it was only ever populated once per week on first miss and then served stale
  // values for the rest of the week as new posts came in, with no invalidation on write.
  const rows = await computeAllWeeklyScores();
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

export async function GET(_req: Request, { params }: { params: Promise<{ category: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const { category } = await params;

  if (category === "calories" || category === "distance") {
    const sorted = await caloriesOrDistanceRows(category);
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "pace") {
    const sorted = await bestPaceRows();
    return NextResponse.json({ rows: sorted.slice(0, 50), me: me ? String(me._id) : null });
  }

  if (category === "streak") {
    const users = await User.find({}).sort({ streakDays: -1 }).limit(50).lean();
    return NextResponse.json({
      rows: users.map((u: any) => ({
        userId: String(u._id),
        username: u.username ?? null,
        name: u.name,
        avatarUrl: u.avatarUrl,
        value: u.streakDays,
        unit: "days",
      })),
      me: me ? String(me._id) : null,
    });
  }

  if (category === "integrity") {
    const users = await User.find({}).sort({ integrityPoints: -1 }).limit(50).lean();
    return NextResponse.json({
      rows: users.map((u: any) => ({
        userId: String(u._id),
        username: u.username ?? null,
        name: u.name,
        avatarUrl: u.avatarUrl,
        value: u.integrityPoints,
        unit: "pts",
      })),
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
