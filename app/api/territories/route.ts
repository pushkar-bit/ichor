import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Territory } from "@/models/Territory";
import { getTerritoryFameLeaderboard } from "@/lib/territoryEngine";
import { sweepBattles } from "@/lib/battles";
import { decayStateFor, holdDays, quietDays } from "@/lib/territoryUpkeep";
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

  const now = new Date();
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
      totalDistanceKm: t.totalDistanceKm ?? 0,
      shieldUntil: t.shieldUntil,
      createdAt: t.createdAt,
      district: t.district ?? null,
      // Upkeep is derived on read (never stored) so the map is honest about fading land even
      // if the daily sweep hasn't run yet — see lib/territoryUpkeep.ts.
      decayState: decayStateFor(t.lastActivityAt, now),
      quietDays: quietDays(t.lastActivityAt, now),
      holdDays: holdDays(t.heldSince, now),
      peakValuePoints: t.peakValuePoints ?? t.valuePoints,
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
