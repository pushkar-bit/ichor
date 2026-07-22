import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Territory } from "@/models/Territory";
import { Clan } from "@/models/Clan";
import { getTerritoryFameLeaderboard } from "@/lib/territoryEngine";
import { sweepBattles } from "@/lib/battles";
import "@/models/User";

/**
 * The central map's data. Fog of war is enforced here: claimRunId/claimStats never leave
 * the server for anyone but the territory's owner — the map shows WHO holds land, never
 * the run that earned it.
 */
export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const myId = me ? String(me._id) : null;

  // Lazy expiry: anything past its deadline resolves before the map is drawn.
  if (myId) await sweepBattles({ userId: myId });

  const [territories, fame] = await Promise.all([
    Territory.find({}).populate("ownerId", "name avatarUrl clanId").sort({ createdAt: 1 }).lean(),
    getTerritoryFameLeaderboard(),
  ]);

  // Owners' clanId is a raw ObjectId (populate() doesn't chain through a second ref without
  // a nested populate on the User model itself) — resolve the distinct set in one query and
  // build a lookup, so the map's clan view doesn't need a second client round-trip.
  const clanIds = [
    ...new Set(
      territories
        .map((t: { ownerId?: { clanId?: unknown } }) => t.ownerId?.clanId)
        .filter(Boolean)
        .map((id: unknown) => String(id)),
    ),
  ];
  const clans = clanIds.length ? await Clan.find({ _id: { $in: clanIds } }).select("name tag color").lean() : [];
  const clanById = new Map(clans.map((c) => [String(c._id), c]));

  const result = territories.map((t: any) => {
    const ownerId = t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null;
    const isMine = myId !== null && ownerId === myId;
    const clan = t.ownerId?.clanId ? clanById.get(String(t.ownerId.clanId)) : null;
    return {
      id: String(t._id),
      name: t.name,
      color: t.color,
      geometry: t.geometry,
      centroid: { lat: t.centroid.coordinates[1], lng: t.centroid.coordinates[0] },
      bbox: t.bbox,
      areaSqM: t.areaSqM,
      valuePoints: t.valuePoints,
      fameScore: t.fameScore,
      totalVisits: t.totalVisits ?? 0,
      totalDistanceKm: t.totalDistanceKm ?? 0,
      shieldUntil: t.shieldUntil,
      createdAt: t.createdAt,
      ownerId,
      ownerName: t.ownerId?.name ?? null,
      ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
      isMine,
      ownerClanId: clan ? String(clan._id) : null,
      ownerClanName: clan?.name ?? null,
      ownerClanTag: clan?.tag ?? null,
      ownerClanColor: clan?.color ?? null,
      // Fog of war: the claim run's stats exist ONLY for the owner's own eyes.
      claimStats: isMine ? t.claimStats : undefined,
    };
  });

  return NextResponse.json({ territories: result, fame });
}
