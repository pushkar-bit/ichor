import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Territory } from "@/models/Territory";
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
    Territory.find({}).populate("ownerId", "name avatarUrl").sort({ createdAt: 1 }).lean(),
    getTerritoryFameLeaderboard(),
  ]);

  const result = territories.map((t: any) => {
    const ownerId = t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null;
    const isMine = myId !== null && ownerId === myId;
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
      shieldUntil: t.shieldUntil,
      createdAt: t.createdAt,
      ownerId,
      ownerName: t.ownerId?.name ?? null,
      ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
      isMine,
      // Fog of war: the claim run's stats exist ONLY for the owner's own eyes.
      claimStats: isMine ? t.claimStats : undefined,
    };
  });

  return NextResponse.json({ territories: result, fame });
}
