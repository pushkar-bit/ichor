import { Territory } from "@/models/Territory";
import { Battle } from "@/models/Battle";
import { simplifyForDisplay, type TerritoryGeometry } from "./geo";
import { getTopDistrictForUser } from "./districts";
import { getActiveObjective, type ActiveObjective } from "./objectives";
import { getLandWarWindow } from "./landWar";
import { decayStateFor, holdDays } from "./territoryUpkeep";

/**
 * The one-line state of a runner's empire, for the persistent strip above the feed.
 *
 * This exists because territory previously had no presence on the surface people actually
 * live on. A For-You card can be ranked out of the slot by twenty other card kinds; a nav
 * link is only seen by someone already looking for it. A strip that is always there, always
 * showing your holdings and anything contesting them, is the cheapest way to make the map
 * part of the app rather than a room off to the side.
 *
 * Deliberately a handful of counts and one headline — a second feed would compete with the
 * feed.
 */

export type TerritorySummary = {
  held: number;
  valuePoints: number;
  /** Land past its upkeep grace period — the number that should worry the user. */
  fading: number;
  /** Battles awaiting this user's response. */
  needsResponse: number;
  activeBattles: number;
  /** Longest current unbroken hold, in days. */
  longestHoldDays: number;
  topDistrict: { district: string; sharePct: number; rank: number } | null;
  objective: ActiveObjective | null;
  landWar: { isOpen: boolean; opensAt: string | null; endsAt: string };
};

type OwnedTerritory = {
  _id: unknown;
  geometry: TerritoryGeometry;
  bbox: [number, number, number, number];
  color: string;
  valuePoints?: number;
  lastActivityAt?: Date;
  heldSince?: Date;
};

export type ProfileTerritory = {
  shapes: {
    id: string;
    geometry: TerritoryGeometry;
    bbox: [number, number, number, number];
    color: string;
    fading: boolean;
  }[];
  zonesHeld: number;
  valuePoints: number;
  longestHoldDays: number;
  topDistrict: { district: string; sharePct: number; rank: number } | null;
};

/**
 * Everything the profile's territory portrait needs. Geometry is simplified here rather than
 * shipped at GPS fidelity — the collage renders a few hundred pixels wide, and a profile
 * shouldn't push a megabyte of coordinates to draw it.
 */
export async function getProfileTerritory(userId: string): Promise<ProfileTerritory> {
  const now = new Date();
  const [owned, topDistrict] = await Promise.all([
    Territory.find({ ownerId: userId })
      .select("geometry bbox color valuePoints lastActivityAt heldSince")
      .sort({ areaSqM: -1 })
      .limit(80)
      .lean() as unknown as Promise<OwnedTerritory[]>,
    getTopDistrictForUser(userId),
  ]);

  let valuePoints = 0;
  let longestHoldDays = 0;
  const shapes = owned.map((t) => {
    valuePoints += t.valuePoints ?? 0;
    longestHoldDays = Math.max(longestHoldDays, holdDays(t.heldSince, now));
    return {
      id: String(t._id),
      geometry: simplifyForDisplay(t.geometry),
      bbox: t.bbox,
      color: t.color,
      fading: decayStateFor(t.lastActivityAt, now) === "FADING",
    };
  });

  return { shapes, zonesHeld: shapes.length, valuePoints, longestHoldDays, topDistrict };
}

export async function getTerritorySummary(userId: string): Promise<TerritorySummary> {
  const now = new Date();
  const [mine, battles, topDistrict, objective] = await Promise.all([
    Territory.find({ ownerId: userId }).select("valuePoints lastActivityAt heldSince").lean() as unknown as Promise<
      OwnedTerritory[]
    >,
    Battle.find({ status: { $ne: "RESOLVED" }, $or: [{ attackerId: userId }, { defenderId: userId }] })
      .select("status defenderId")
      .lean() as unknown as Promise<{ status: string; defenderId: unknown }[]>,
    getTopDistrictForUser(userId),
    getActiveObjective(userId),
  ]);

  const held = mine.length;
  let valuePoints = 0;
  let fading = 0;
  let longestHoldDays = 0;
  for (const t of mine) {
    valuePoints += t.valuePoints ?? 0;
    if (decayStateFor(t.lastActivityAt, now) === "FADING") fading++;
    longestHoldDays = Math.max(longestHoldDays, holdDays(t.heldSince, now));
  }

  const needsResponse = battles.filter((b) => b.status === "PENDING_RESPONSE" && String(b.defenderId) === userId).length;

  const war = getLandWarWindow(now);

  return {
    held,
    valuePoints,
    fading,
    needsResponse,
    activeBattles: battles.length,
    longestHoldDays,
    topDistrict,
    objective,
    landWar: {
      isOpen: war.isOpen,
      opensAt: war.nextStart ? war.nextStart.toISOString() : null,
      endsAt: war.end.toISOString(),
    },
  };
}
