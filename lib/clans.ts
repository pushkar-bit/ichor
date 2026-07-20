import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import "@/models/User"; // registers the User model before ClanMember/Territory populate() calls below
import { computeAllWeeklyScores, computeUserWeeklyScore } from "./scoring";
import { PER_KM_POINTS } from "./points";

export async function getClanList() {
  const clans = await Clan.find({}).lean();
  const allScores = await computeAllWeeklyScores();

  const rows = await Promise.all(
    clans.map(async (clan: any) => {
      const members = await ClanMember.find({ clanId: clan._id }).lean();
      const memberIds = members.map((m: any) => String(m.userId));
      const combined = allScores
        .filter((r) => memberIds.includes(String(r.user._id)))
        .reduce((s, r) => s + r.score.finalScore, 0);
      // Territory has no clanId field — a clan's land is the union of its members' owned
      // territories, joined through ownerId.
      const zonesHeld = memberIds.length
        ? await Territory.countDocuments({ ownerId: { $in: memberIds } })
        : 0;
      return {
        id: String(clan._id),
        name: clan.name,
        tag: clan.tag,
        color: clan.color,
        memberCount: members.length,
        score: combined + zonesHeld * 200,
        zonesHeld,
      };
    }),
  );

  return rows.sort((a, b) => b.score - a.score).slice(0, 20);
}

/**
 * Everything the standalone "empire" page needs for one clan: its members' individual
 * contributions and the union of their territories as one collective landmass, plus a
 * collective points figure — every km any clan territory has been run credits this total,
 * at the same per-km rate an individual runner earns (see points.md).
 */
export async function getClanEmpire(clanId: string, viewerId?: string) {
  const clan = await Clan.findById(clanId).lean();
  if (!clan) return null;

  const members = await ClanMember.find({ clanId }).populate("userId").sort({ role: 1, joinedAt: 1 }).lean();
  const memberRows = await Promise.all(
    members.map(async (m: any) => {
      const score = await computeUserWeeklyScore(String(m.userId._id));
      return {
        userId: String(m.userId._id),
        name: m.userId.name as string,
        avatarUrl: m.userId.avatarUrl as string | null,
        role: m.role as string,
        weeklyScore: score.finalScore,
      };
    }),
  );

  const memberIds = members.map((m: any) => String(m.userId._id));
  const territories = memberIds.length
    ? await Territory.find({ ownerId: { $in: memberIds } })
        .select("name color geometry centroid bbox areaSqM valuePoints fameScore totalDistanceKm shieldUntil createdAt ownerId")
        .populate("ownerId", "name avatarUrl")
        .lean()
    : [];

  const collectiveKm = territories.reduce((s: number, t: any) => s + (t.totalDistanceKm ?? 0), 0);

  return {
    id: String((clan as any)._id),
    name: (clan as any).name as string,
    tag: (clan as any).tag as string,
    color: (clan as any).color as string,
    members: memberRows,
    territories: territories.map((t: any) => ({
      id: String(t._id),
      name: t.name,
      color: t.color,
      geometry: t.geometry,
      centroid: { lat: t.centroid.coordinates[1], lng: t.centroid.coordinates[0] },
      bbox: t.bbox,
      areaSqM: t.areaSqM,
      valuePoints: t.valuePoints,
      fameScore: t.fameScore,
      totalDistanceKm: t.totalDistanceKm,
      shieldUntil: t.shieldUntil,
      createdAt: t.createdAt,
      ownerId: t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null,
      ownerName: t.ownerId?.name ?? null,
      ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
      isMine: viewerId ? String(t.ownerId?._id ?? t.ownerId) === viewerId : false,
    })),
    zonesHeld: territories.length,
    collectiveKm: Math.round(collectiveKm * 100) / 100,
    collectivePoints: Math.round(collectiveKm * PER_KM_POINTS),
  };
}
