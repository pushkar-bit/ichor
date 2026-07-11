import { Territory } from "@/models/Territory";
import { Attack } from "@/models/Attack";
import { User } from "@/models/User";
import { Post } from "@/models/Post";

const ATTACK_EXPIRY_HOURS = 48;
const FRESH_RUN_BONUS = 1.5;
const ATTACK_WIN_BONUS = 200;
const WAR_WIN_BONUS = 300;
const EXPLOIT_MULTIPLIER = 0.5;

/** Every visit — claim, defend, attack, exploit — makes a zone more "famous," independent
 * of who ends up owning it. Mutates the loaded territory doc; caller still saves it. */
function bumpFame(territory: { distinctRunnerIds: unknown[]; totalVisits: number; fameScore: number }, userId: string) {
  const alreadyRan = territory.distinctRunnerIds.some((id) => String(id) === String(userId));
  if (!alreadyRan) territory.distinctRunnerIds.push(userId);
  territory.totalVisits += 1;
  territory.fameScore = territory.distinctRunnerIds.length * 10 + territory.totalVisits;
}

export type ZoneContest = {
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string;
  territoryName: string;
  weeklyCalorieScore: number;
};

/** Null if the zone is unclaimed or already owned by this user — nothing to contest. */
export async function getZoneContest(zoneId: string, userId: string): Promise<ZoneContest | null> {
  const territory = await Territory.findOne({ zoneId }).populate("ownerId").populate("zoneId");
  if (!territory || !territory.ownerId) return null;
  if (String(territory.ownerId._id ?? territory.ownerId) === String(userId)) return null;

  const owner = territory.ownerId as any;
  const zone = territory.zoneId as any;
  return {
    ownerId: String(owner._id ?? owner),
    ownerName: owner.name ?? "Athlete",
    ownerAvatarUrl: owner.avatarUrl ?? "",
    territoryName: zone?.name ?? "this zone",
    weeklyCalorieScore: territory.weeklyCalorieScore,
  };
}

/**
 * Mirrors services/territoryService.ts from the PRD: claiming a zone either takes an
 * unclaimed zone outright, updates your own score, or triggers a PENDING attack if you
 * out-score the current owner. Used for zones you already own or that are unclaimed —
 * see claimOrContestZone for the branching invasion flow (attack/exploit/ignore).
 */
export async function claimZone(userId: string, zoneId: string, calorieScore: number) {
  const existing = await Territory.findOne({ zoneId });

  if (!existing) {
    await Territory.create({
      zoneId,
      ownerId: userId,
      weeklyCalorieScore: calorieScore,
      acquiredAt: new Date(),
      distinctRunnerIds: [userId],
      totalVisits: 1,
      fameScore: 11, // 1 distinct runner * 10 + 1 visit
    });
    return { event: "ZONE_CLAIMED" as const };
  }

  if (String(existing.ownerId) === String(userId)) {
    existing.weeklyCalorieScore += calorieScore;
    bumpFame(existing, userId);
    await existing.save();
    return { event: "SCORE_UPDATED" as const };
  }

  if (calorieScore > existing.weeklyCalorieScore) {
    const attack = await Attack.create({
      attackerId: userId,
      defenderId: existing.ownerId,
      zoneId,
      status: "PENDING",
      type: "STAT",
      attackerScore: calorieScore,
      defenderScore: existing.weeklyCalorieScore,
      expiresAt: new Date(Date.now() + ATTACK_EXPIRY_HOURS * 3600 * 1000),
    });
    bumpFame(existing, userId);
    await existing.save();
    return { event: "ATTACK_TRIGGERED" as const, attackId: String(attack._id) };
  }

  bumpFame(existing, userId);
  await existing.save();
  return { event: "NO_CHANGE" as const };
}

type ContestResult = {
  contestStatus: "NONE" | "ATTACKED" | "EXPLOITED";
  scoreMultiplier: number;
  battleBonusPoints: number;
  attackId?: string;
};

/**
 * Called from POST /api/posts when the tagged zone belongs to someone else. The user has
 * already chosen ATTACK or EXPLOIT client-side (IGNORE means the caller never sets a
 * zoneId at all, so this function is never reached for that choice).
 */
export async function claimOrContestZone(params: {
  userId: string;
  zoneId: string;
  workoutId: string;
  caloriesBurned: number;
  paceBonus: number;
  contestChoice: "ATTACK" | "EXPLOIT";
}): Promise<ContestResult> {
  const { userId, zoneId, workoutId, caloriesBurned, paceBonus, contestChoice } = params;
  const territory = await Territory.findOne({ zoneId });

  // Zone turned out to be unclaimed or already theirs by the time this ran (race with
  // another post) — fall back to a normal claim, no contest.
  if (!territory || !territory.ownerId || String(territory.ownerId) === String(userId)) {
    await claimZone(userId, zoneId, caloriesBurned * paceBonus);
    return { contestStatus: "NONE", scoreMultiplier: 1, battleBonusPoints: 0 };
  }

  if (contestChoice === "EXPLOIT") {
    bumpFame(territory, userId);
    await territory.save();
    return { contestStatus: "EXPLOITED", scoreMultiplier: EXPLOIT_MULTIPLIER, battleBonusPoints: 0 };
  }

  // ATTACK
  const attackerScore = caloriesBurned * paceBonus * FRESH_RUN_BONUS;
  const attack = await Attack.create({
    attackerId: userId,
    defenderId: territory.ownerId,
    zoneId,
    status: "PENDING",
    type: "STAT",
    attackerScore,
    defenderScore: territory.weeklyCalorieScore,
    attackRunId: workoutId,
    expiresAt: new Date(Date.now() + ATTACK_EXPIRY_HOURS * 3600 * 1000),
  });
  bumpFame(territory, userId);
  await territory.save();

  return { contestStatus: "ATTACKED", scoreMultiplier: 1, battleBonusPoints: 0, attackId: String(attack._id) };
}

export async function getTerritoryFameLeaderboard(limit = 20) {
  const territories = await Territory.find({ fameScore: { $gt: 0 } })
    .sort({ fameScore: -1 })
    .limit(limit)
    .populate("zoneId")
    .populate("ownerId")
    .populate("clanId")
    .lean();

  return territories.map((t: any) => ({
    zoneId: String(t.zoneId?._id ?? t.zoneId),
    zoneName: t.zoneId?.name ?? "Unknown zone",
    ownerId: t.ownerId ? String(t.ownerId._id ?? t.ownerId) : null,
    ownerName: t.ownerId?.name ?? null,
    ownerAvatarUrl: t.ownerId?.avatarUrl ?? null,
    clanName: t.clanId?.name ?? null,
    clanColor: t.clanId?.color ?? null,
    fameScore: t.fameScore,
    distinctRunners: t.distinctRunnerIds?.length ?? 0,
    totalVisits: t.totalVisits ?? 0,
  }));
}

/** Applies the outcome of a resolved attack/war to the post that triggered it, if any. */
async function applyBattleResultToPost(attackRunId: unknown, won: boolean, bonus: number) {
  if (!attackRunId) return;
  await Post.updateOne(
    { workoutId: attackRunId },
    won
      ? { contestStatus: "ATTACK_WON", battleBonusPoints: bonus, scoreMultiplier: 1 }
      : { contestStatus: "ATTACK_LOST", scoreMultiplier: 0, battleBonusPoints: 0 },
  );
}

/**
 * Immediate stat-battle resolution — used for both the defender choosing "Defend" and
 * for forfeits/expiry (where the attacker always wins). Compares the stored scores
 * (attackerScore already includes the 1.5x fresh-run bonus from claimOrContestZone).
 */
export async function resolveAttack(attackId: string, winnerId: string) {
  const attack = await Attack.findById(attackId);
  if (!attack) return null;

  const territory = await Territory.findOne({ zoneId: attack.zoneId });
  const attackerWon = String(winnerId) === String(attack.attackerId);
  const loserId = attackerWon ? attack.defenderId : attack.attackerId;

  if (territory) {
    territory.ownerId = winnerId;
    territory.acquiredAt = new Date();
    territory.lastDefended = new Date();
    territory.weeklyCalorieScore = attackerWon ? attack.attackerScore : attack.defenderScore;
    await territory.save();
  }

  attack.status = "RESOLVED";
  attack.winnerId = winnerId;
  attack.resolution = attackerWon ? "ATTACKER_WIN" : "DEFENDER_WIN";
  attack.resolvedAt = new Date();
  await attack.save();

  await User.updateOne({ _id: winnerId }, { $inc: { battlesWon: 1 } });
  await User.updateOne({ _id: loserId }, { $inc: { battlesLost: 1 } });

  // Only the attacker's triggering run carries a battle outcome — a defender keeping
  // their zone doesn't have an "attack run" of their own to adjust.
  if (attackerWon) {
    await applyBattleResultToPost(attack.attackRunId, true, ATTACK_WIN_BONUS);
  } else {
    await applyBattleResultToPost(attack.attackRunId, false, 0);
  }

  return attack;
}

/** War resolution: same shape as resolveAttack but with the larger 300pt war bonus. */
export async function resolveWar(attackId: string, winnerId: string) {
  const attack = await Attack.findById(attackId);
  if (!attack) return null;

  const territory = await Territory.findOne({ zoneId: attack.zoneId });
  const attackerWon = String(winnerId) === String(attack.attackerId);
  const loserId = attackerWon ? attack.defenderId : attack.attackerId;

  if (territory) {
    territory.ownerId = winnerId;
    territory.acquiredAt = new Date();
    territory.lastDefended = new Date();
    await territory.save();
  }

  attack.status = "RESOLVED";
  attack.winnerId = winnerId;
  attack.resolution = attackerWon ? "ATTACKER_WIN" : "DEFENDER_WIN";
  attack.resolvedAt = new Date();
  await attack.save();

  await User.updateOne({ _id: winnerId }, { $inc: { battlesWon: 1 } });
  await User.updateOne({ _id: loserId }, { $inc: { battlesLost: 1 } });

  if (attack.attackRunId) {
    await applyBattleResultToPost(attack.attackRunId, attackerWon, attackerWon ? WAR_WIN_BONUS : 0);
  }

  return attack;
}
