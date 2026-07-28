import { Clan, ClanMember } from "@/models/Clan";
import { PointsLedger } from "@/models/PointsLedger";
import { User } from "@/models/User";
import { notify } from "./notifications";
import { award } from "./points";
import { startOfWeek, weekKey } from "./week";

/**
 * Land War — the weekend the map means more.
 *
 * Everything else in the territory game is always-on, which is exactly why none of it has a
 * rhythm: there's no moment the whole club shows up for. The Land War is a fixed window at
 * the end of every ICHOR week (the same Mon–Sun UTC week the feed resets on) where running
 * through *rival clans'* ground pays your own clan a bonus on top of the normal landlord
 * economy. Two days, once a week, everyone knows when.
 *
 * It changes no ownership rules — you can't take land faster during a war. It only changes
 * what crossing a rival's ground is worth, so the incentive is to go run somewhere you
 * normally wouldn't, which is the behaviour worth encouraging.
 */

/** The war opens this many days into the ICHOR week (Mon=0, so 5 = Saturday 00:00 UTC). */
const WAR_START_DAY_OFFSET = 5;
/** ...and runs to the end of the week (Sunday 23:59:59 UTC). */
const WAR_LENGTH_DAYS = 2;
/** Points per credited km through rival-clan land during the window. */
export const LAND_WAR_POINTS_PER_KM = 8;

const DAY_MS = 86400e3;

export type LandWarWindow = {
  weekKey: string;
  start: Date;
  end: Date;
  isOpen: boolean;
  /** When the next war opens, if one isn't running right now. */
  nextStart: Date | null;
};

/** The war window for the ICHOR week `now` falls in, plus whether it's live. */
export function getLandWarWindow(now = new Date()): LandWarWindow {
  const weekStart = startOfWeek(now);
  const start = new Date(weekStart.getTime() + WAR_START_DAY_OFFSET * DAY_MS);
  const end = new Date(start.getTime() + WAR_LENGTH_DAYS * DAY_MS);
  const isOpen = now >= start && now < end;
  const nextStart = isOpen ? null : now < start ? start : new Date(start.getTime() + 7 * DAY_MS);
  return { weekKey: weekKey(now), start, end, isOpen, nextStart };
}

/**
 * Pays the war bonus for one run's credit on one territory. Called from the territory
 * pipeline for every fame credit, and a no-op unless *all* of these hold: the war is open,
 * the runner is in a clan, the land's owner is in a different clan.
 *
 * Idempotent through the same (workout, territory) uniqueKey shape the landlord bonus uses,
 * so a webhook replay can't double-pay.
 */
export async function awardLandWarCredit(params: {
  runnerId: unknown;
  ownerId: unknown;
  territoryId: unknown;
  workoutId: unknown;
  creditedKm: number;
  now?: Date;
}): Promise<number> {
  const { runnerId, ownerId, territoryId, workoutId, creditedKm, now = new Date() } = params;
  if (!getLandWarWindow(now).isOpen) return 0;
  if (!ownerId || String(ownerId) === String(runnerId)) return 0;

  const [runner, owner] = await Promise.all([
    User.findById(runnerId).select("clanId").lean() as Promise<{ clanId?: unknown } | null>,
    User.findById(ownerId).select("clanId").lean() as Promise<{ clanId?: unknown } | null>,
  ]);
  // No clan on either side means there's nothing to win it for — the war is between empires.
  if (!runner?.clanId || !owner?.clanId) return 0;
  if (String(runner.clanId) === String(owner.clanId)) return 0;

  const points = Math.round(creditedKm * LAND_WAR_POINTS_PER_KM);
  if (points <= 0) return 0;

  const paid = await award(runnerId, "LAND_WAR_BONUS", points, `war:${workoutId}:${territoryId}`, {
    territoryId,
    workoutId,
  });
  return paid ? points : 0;
}

export type LandWarStanding = {
  clanId: string;
  name: string;
  tag: string;
  color: string;
  points: number;
  contributors: number;
};

/**
 * Clan standings for a given war window, summed straight from the ledger — no separate
 * scoreboard document to drift out of sync with what was actually paid.
 */
export async function getLandWarStandings(window: LandWarWindow): Promise<LandWarStanding[]> {
  const rows = (await PointsLedger.aggregate([
    {
      $match: {
        reason: "LAND_WAR_BONUS",
        createdAt: { $gte: window.start, $lt: window.end },
      },
    },
    { $group: { _id: "$userId", points: { $sum: "$amount" } } },
  ])) as { _id: unknown; points: number }[];

  if (rows.length === 0) return [];

  const memberships = (await ClanMember.find({ userId: { $in: rows.map((r) => r._id) } })
    .select("clanId userId")
    .lean()) as unknown as { clanId: unknown; userId: unknown }[];
  const clanByUser = new Map(memberships.map((m) => [String(m.userId), String(m.clanId)]));

  const byClan = new Map<string, { points: number; contributors: Set<string> }>();
  for (const row of rows) {
    const clanId = clanByUser.get(String(row._id));
    if (!clanId) continue;
    const tally = byClan.get(clanId) ?? { points: 0, contributors: new Set<string>() };
    tally.points += row.points;
    tally.contributors.add(String(row._id));
    byClan.set(clanId, tally);
  }

  const clans = (await Clan.find({ _id: { $in: [...byClan.keys()] } })
    .select("name tag color")
    .lean()) as unknown as { _id: unknown; name: string; tag: string; color: string }[];

  return clans
    .map((c) => ({
      clanId: String(c._id),
      name: c.name,
      tag: c.tag,
      color: c.color,
      points: byClan.get(String(c._id))?.points ?? 0,
      contributors: byClan.get(String(c._id))?.contributors.size ?? 0,
    }))
    .sort((a, b) => b.points - a.points);
}

/**
 * Announces the war opening to every clan member. Safe to call repeatedly — notifications
 * are best-effort awareness, so the cron route guards against re-announcing rather than
 * relying on this.
 */
export async function announceLandWarOpen(): Promise<number> {
  const members = (await ClanMember.find({}).select("userId").lean()) as unknown as { userId: unknown }[];
  for (const m of members) {
    await notify(
      m.userId,
      "LAND_WAR_OPEN",
      "Land War is live",
      `Until Sunday night, every kilometre you run through a rival clan's ground pays your empire ${LAND_WAR_POINTS_PER_KM} points per km. Go somewhere you don't normally run.`,
    );
  }
  return members.length;
}

/** Posts the finished war's result to every member of every clan that scored. */
export async function announceLandWarResult(window: LandWarWindow): Promise<LandWarStanding[]> {
  const standings = await getLandWarStandings(window);
  if (standings.length === 0) return [];

  const winner = standings[0];
  for (const standing of standings) {
    const members = (await ClanMember.find({ clanId: standing.clanId }).select("userId").lean()) as unknown as {
      userId: unknown;
    }[];
    const won = standing.clanId === winner.clanId;
    for (const m of members) {
      await notify(
        m.userId,
        "LAND_WAR_RESULT",
        won ? `${standing.name} won the Land War` : `Land War over — ${winner.name} took it`,
        won
          ? `${standing.points} points from ${standing.contributors} runner${standing.contributors === 1 ? "" : "s"}. The map remembers.`
          : `You finished on ${standing.points} points. ${winner.name} led with ${winner.points}.`,
      );
    }
  }
  return standings;
}
