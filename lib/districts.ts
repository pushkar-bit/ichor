import { Territory } from "@/models/Territory";
import { User } from "@/models/User";

/**
 * District standings — the local scope.
 *
 * A single global fame leaderboard is won permanently by whoever runs the most kilometres,
 * which leaves everyone else with nothing to play for. A district is small enough that an
 * ordinary runner can plausibly lead one: "you own 12% of Koramangala" is a goal, where
 * "you're #47 in the world" is a wall.
 *
 * The district string is captured once per territory at claim time (see placeForTerritory in
 * lib/territoryEngine.ts) rather than geocoded per read, so this is a pure aggregation.
 */

export type DistrictHolder = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  territories: number;
  areaSqM: number;
  sharePct: number;
};

export type DistrictStanding = {
  district: string;
  totalTerritories: number;
  totalAreaSqM: number;
  holders: DistrictHolder[];
  /** The viewer's own standing here, if they hold any of it. */
  me: { rank: number; sharePct: number; territories: number } | null;
};

/**
 * Standings for every district that has claimed land, ranked by how much of the district's
 * total claimed area each runner holds. Share is of *claimed* ground, not of the district's
 * real-world area — nobody could ever run 100% of a suburb, and a percentage that can never
 * exceed 2% is not a motivating number.
 */
export async function getDistrictStandings(
  viewerId: string | null,
  { limit = 12, holdersPerDistrict = 5 }: { limit?: number; holdersPerDistrict?: number } = {},
): Promise<DistrictStanding[]> {
  const territories = (await Territory.find({ district: { $ne: null } })
    .select("district ownerId areaSqM")
    .lean()) as unknown as { district: string; ownerId: unknown; areaSqM: number }[];

  if (territories.length === 0) return [];

  // district -> ownerId -> tally
  const byDistrict = new Map<string, Map<string, { territories: number; areaSqM: number }>>();
  for (const t of territories) {
    if (!t.district || !t.ownerId) continue;
    const owners = byDistrict.get(t.district) ?? new Map();
    const ownerKey = String(t.ownerId);
    const tally = owners.get(ownerKey) ?? { territories: 0, areaSqM: 0 };
    tally.territories += 1;
    tally.areaSqM += t.areaSqM ?? 0;
    owners.set(ownerKey, tally);
    byDistrict.set(t.district, owners);
  }

  // One batched user lookup for every holder that could appear in the response.
  const ownerIds = new Set<string>();
  for (const owners of byDistrict.values()) for (const id of owners.keys()) ownerIds.add(id);
  const users = (await User.find({ _id: { $in: [...ownerIds] } })
    .select("name avatarUrl")
    .lean()) as unknown as { _id: unknown; name?: string; avatarUrl?: string }[];
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const standings: DistrictStanding[] = [];
  for (const [district, owners] of byDistrict) {
    const totalArea = [...owners.values()].reduce((s, o) => s + o.areaSqM, 0);
    const totalTerritories = [...owners.values()].reduce((s, o) => s + o.territories, 0);

    const ranked = [...owners.entries()]
      .map(([userId, tally]) => ({
        userId,
        name: userById.get(userId)?.name ?? "Athlete",
        avatarUrl: userById.get(userId)?.avatarUrl ?? null,
        territories: tally.territories,
        areaSqM: tally.areaSqM,
        sharePct: totalArea > 0 ? Math.round((tally.areaSqM / totalArea) * 100) : 0,
      }))
      .sort((a, b) => b.areaSqM - a.areaSqM);

    const myIndex = viewerId ? ranked.findIndex((r) => r.userId === viewerId) : -1;

    standings.push({
      district,
      totalTerritories,
      totalAreaSqM: totalArea,
      holders: ranked.slice(0, holdersPerDistrict),
      me:
        myIndex >= 0
          ? { rank: myIndex + 1, sharePct: ranked[myIndex].sharePct, territories: ranked[myIndex].territories }
          : null,
    });
  }

  // Districts the viewer actually plays in come first — a standings board that opens on a
  // suburb they've never run is a leaderboard about strangers.
  return standings
    .sort((a, b) => {
      if (Boolean(a.me) !== Boolean(b.me)) return a.me ? -1 : 1;
      return b.totalAreaSqM - a.totalAreaSqM;
    })
    .slice(0, limit);
}

/** The viewer's headline district line for the feed strip: their strongest local standing. */
export async function getTopDistrictForUser(
  viewerId: string,
): Promise<{ district: string; sharePct: number; rank: number } | null> {
  const standings = await getDistrictStandings(viewerId, { limit: 50, holdersPerDistrict: 1 });
  const mine = standings.filter((s) => s.me !== null);
  if (mine.length === 0) return null;
  const best = mine.reduce((a, b) => (b.me!.sharePct > a.me!.sharePct ? b : a));
  return { district: best.district, sharePct: best.me!.sharePct, rank: best.me!.rank };
}
