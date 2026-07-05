import { Territory } from "@/models/Territory";
import { Attack } from "@/models/Attack";
import { User } from "@/models/User";

/**
 * Mirrors services/territoryService.ts from the PRD: claiming a zone either takes an
 * unclaimed zone outright, updates your own score, or triggers a PENDING attack if you
 * out-score the current owner.
 */
export async function claimZone(userId: string, zoneId: string, calorieScore: number) {
  const existing = await Territory.findOne({ zoneId });

  if (!existing) {
    await Territory.create({
      zoneId,
      ownerId: userId,
      weeklyCalorieScore: calorieScore,
      acquiredAt: new Date(),
    });
    return { event: "ZONE_CLAIMED" as const };
  }

  if (String(existing.ownerId) === String(userId)) {
    existing.weeklyCalorieScore += calorieScore;
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
    });
    return { event: "ATTACK_TRIGGERED" as const, attackId: String(attack._id) };
  }

  return { event: "NO_CHANGE" as const };
}

export async function resolveAttack(attackId: string, winnerId: string) {
  const attack = await Attack.findById(attackId);
  if (!attack) return null;

  const territory = await Territory.findOne({ zoneId: attack.zoneId });
  const loserId = String(winnerId) === String(attack.attackerId) ? attack.defenderId : attack.attackerId;

  if (territory) {
    territory.ownerId = winnerId;
    territory.acquiredAt = new Date();
    territory.lastDefended = new Date();
    await territory.save();
  }

  attack.status = "RESOLVED";
  attack.winnerId = winnerId;
  attack.resolvedAt = new Date();
  await attack.save();

  await User.updateOne({ _id: winnerId }, { $inc: { battlesWon: 1 } });
  await User.updateOne({ _id: loserId }, { $inc: { battlesLost: 1 } });

  return attack;
}
