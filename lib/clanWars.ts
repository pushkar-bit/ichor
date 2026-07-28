import { ClanWar } from "@/models/ClanWar";
import { ClanMember, Clan } from "@/models/Clan";
import { Workout } from "@/models/Workout";

const WAR_WINDOW_HOURS = 48;

async function memberIdsOf(clanId: unknown): Promise<string[]> {
  const members = await ClanMember.find({ clanId }).select("userId").lean();
  return members.map((m: { userId: unknown }) => String(m.userId));
}

async function kmForMembersInWindow(memberIds: string[], start: Date, end: Date): Promise<number> {
  if (memberIds.length === 0) return 0;
  const workouts = await Workout.find({
    userId: { $in: memberIds },
    workoutDate: { $gte: start, $lt: end },
  })
    .select("distanceKm")
    .lean();
  return workouts.reduce((s: number, w: { distanceKm: number }) => s + (w.distanceKm ?? 0), 0);
}

export async function declareClanWar(clanId: unknown, enemyClanId: unknown, declaredById: unknown) {
  if (String(clanId) === String(enemyClanId)) throw new Error("a clan can't declare war on itself");

  const enemy = await Clan.findById(enemyClanId).lean();
  if (!enemy) throw new Error("enemy clan not found");

  const existing = await ClanWar.findOne({
    status: "ACTIVE",
    $or: [
      { clanAId: clanId, clanBId: enemyClanId },
      { clanAId: enemyClanId, clanBId: clanId },
    ],
  });
  if (existing) throw new Error("these clans are already at war");

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + WAR_WINDOW_HOURS * 3600_000);
  const war = await ClanWar.create({ clanAId: clanId, clanBId: enemyClanId, declaredById, startedAt, endsAt });
  return war;
}

export async function resolveClanWar(warId: unknown): Promise<boolean> {
  const war = await ClanWar.findOneAndUpdate(
    { _id: warId, status: "ACTIVE", endsAt: { $lte: new Date() } },
    { status: "RESOLVED" },
  );
  if (!war) return false;

  const [clanAMembers, clanBMembers] = await Promise.all([memberIdsOf(war.clanAId), memberIdsOf(war.clanBId)]);
  const [clanAKm, clanBKm] = await Promise.all([
    kmForMembersInWindow(clanAMembers, war.startedAt, war.endsAt),
    kmForMembersInWindow(clanBMembers, war.startedAt, war.endsAt),
  ]);

  const winnerId = clanAKm === clanBKm ? null : clanAKm > clanBKm ? war.clanAId : war.clanBId;
  await ClanWar.updateOne({ _id: war._id }, { clanAKm, clanBKm, winnerId });
  if (winnerId) await Clan.updateOne({ _id: winnerId }, { $inc: { battlesWon: 1 } });

  return true;
}

/** Cron sweep: resolves every war whose window has closed. */
export async function sweepClanWars(): Promise<number> {
  const due = await ClanWar.find({ status: "ACTIVE", endsAt: { $lte: new Date() } }).select("_id").lean();
  let resolved = 0;
  for (const w of due as { _id: unknown }[]) {
    if (await resolveClanWar(w._id)) resolved++;
  }
  return resolved;
}

export async function getClanWars(clanId: unknown) {
  const wars = await ClanWar.find({ $or: [{ clanAId: clanId }, { clanBId: clanId }] })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("clanAId", "name tag color")
    .populate("clanBId", "name tag color")
    .lean();

  return wars.map((w: any) => ({
    id: String(w._id),
    status: w.status,
    startedAt: w.startedAt,
    endsAt: w.endsAt,
    clanA: { id: String(w.clanAId._id), name: w.clanAId.name, tag: w.clanAId.tag, color: w.clanAId.color, km: w.clanAKm },
    clanB: { id: String(w.clanBId._id), name: w.clanBId.name, tag: w.clanBId.tag, color: w.clanBId.color, km: w.clanBKm },
    winnerId: w.winnerId ? String(w.winnerId) : null,
  }));
}
