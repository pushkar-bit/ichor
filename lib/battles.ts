import { Battle } from "@/models/Battle";
import { Territory } from "@/models/Territory";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
import { notify } from "./notifications";
import { award } from "./points";
import { colorForUser, isTerritoryEligibleRun, ATTACK_COVERAGE_THRESHOLD } from "./territoryEngine";
import { reverseGeocode } from "./geocoding";
import {
  buildRunCorridor,
  coverageRatio,
  splitTerritory,
  runQualifiesInTerritory,
  type TerritoryGeometry,
} from "./geo";

/**
 * The fog-of-war battle state machine.
 *
 *   PENDING_RESPONSE ──REFUSE / 48h silence──▶ RESOLVED (SPLIT: land divided, value decays)
 *          │
 *          ├─ACCEPT_ASYNC──▶ ASYNC_ACTIVE ──72h──▶ RESOLVED (entries compared / forfeits)
 *          └─ACCEPT_DUEL───▶ DUEL_SCHEDULED ──window ends──▶ RESOLVED
 *
 * Every deadline resolves lazily on read (sweepBattles) AND via the cron route — nothing
 * assumes a scheduler exists. Resolutions take the doc through an atomic status flip so
 * two concurrent sweeps can't double-split a territory.
 */

export type BattleMetric = "PACE" | "DISTANCE";

const RESPOND_HOURS = 48;
const ASYNC_HOURS = 72;
export const PACE_MIN_KM = 3;
export const DISTANCE_MIN_KM = 8;
const ATTACK_RUN_MAX_AGE_HOURS = 24;
const DUEL_MAX_START_DAYS = 7;
const DUEL_MIN_WINDOW_HOURS = 1;
const DUEL_MAX_WINDOW_HOURS = 24;

/** A refused battle burns 30% of the territory's value before the land is divided. */
const REFUSAL_VALUE_KEEP = 0.7;
const REFUSAL_BETTER_LOSS = -25;
const REFUSAL_WORSE_LOSS = -75;
const DUEL_DOUBLE_FORFEIT_LOSS = -50;
const ASYNC_FORFEIT_ATTACKER_LOSS = -50;
const ASYNC_FORFEIT_DEFENDER_LOSS = -25;
const BATTLE_WIN_POINTS = 100;
const STAT_PENALTY_LOSS = -25;

const SHIELD_HOURS = 72;
const ATTACKER_COOLDOWN_DAYS = 7;
const MAX_ACTIVE_OUTGOING = 3;

type RunStats = {
  distanceKm: number;
  avgPaceMinPerKm: number | null;
  durationSeconds?: number | null;
  workoutDate?: Date | null;
};

/** Positive → a is better; PACE = lower pace wins, DISTANCE = more distance wins. */
function compareOnMetric(a: RunStats, b: RunStats, metric: BattleMetric): number {
  if (metric === "DISTANCE") return a.distanceKm - b.distanceKm;
  const aPace = a.avgPaceMinPerKm ?? Infinity;
  const bPace = b.avgPaceMinPerKm ?? Infinity;
  return bPace - aPace;
}

function shieldDate(): Date {
  return new Date(Date.now() + SHIELD_HOURS * 3600 * 1000);
}

async function revealAndNotify(battle: any, headline: (side: "attacker" | "defender") => string) {
  await notify(battle.attackerId, "BATTLE_RESOLVED", headline("attacker"), "Both runs are now revealed. See the battle report.", {
    battleId: battle._id,
    territoryId: battle.territoryId,
  });
  await notify(battle.defenderId, "BATTLE_RESOLVED", headline("defender"), "Both runs are now revealed. See the battle report.", {
    battleId: battle._id,
    territoryId: battle.territoryId,
  });
}

/** Atomic claim of the right to resolve — the loser of the race gets null and backs off. */
async function claimResolution(battleId: unknown, expectedStatus: string) {
  return Battle.findOneAndUpdate(
    { _id: battleId, status: expectedStatus },
    { $set: { status: "RESOLVED", resolvedAt: new Date() } },
    { new: true },
  );
}

// ---------------------------------------------------------------------------
// Attack creation
// ---------------------------------------------------------------------------

export async function createBattle(params: {
  attacker: { _id: unknown; name?: string };
  workoutId: string;
  territoryId: string;
  proposedMetric: BattleMetric;
}): Promise<{ battleId: string } | { error: string }> {
  const { attacker, workoutId, territoryId, proposedMetric } = params;
  const attackerId = String(attacker._id);

  const workout = await Workout.findOne({ _id: workoutId, userId: attacker._id }).lean();
  if (!workout) return { error: "Run not found." };
  if (!isTerritoryEligibleRun(workout as any)) return { error: "Only GPS-verified runs can attack." };
  const ageHours = (Date.now() - new Date((workout as any).workoutDate).getTime()) / 3600e3;
  if (ageHours > ATTACK_RUN_MAX_AGE_HOURS) return { error: "That run is too old to attack with — attacks must come from a fresh run." };

  const territory = await Territory.findById(territoryId);
  if (!territory) return { error: "Territory not found." };
  if (String(territory.ownerId) === attackerId) return { error: "You already own this land." };
  if (territory.shieldUntil && territory.shieldUntil > new Date()) {
    return { error: "This territory is shielded after a recent battle." };
  }

  const activeOnTerritory = await Battle.exists({ territoryId, status: { $ne: "RESOLVED" } });
  if (activeOnTerritory) return { error: "There's already an active battle for this territory." };

  const myActive = await Battle.countDocuments({ attackerId: attacker._id, status: { $ne: "RESOLVED" } });
  if (myActive >= MAX_ACTIVE_OUTGOING) return { error: `You can only have ${MAX_ACTIVE_OUTGOING} attacks in flight.` };

  const recentLoss = await Battle.exists({
    attackerId: attacker._id,
    territoryId,
    status: "RESOLVED",
    resolution: "DEFENDER_WIN",
    resolvedAt: { $gte: new Date(Date.now() - ATTACKER_COOLDOWN_DAYS * 86400e3) },
  });
  if (recentLoss) return { error: "You lost here recently — wait out the cooldown before attacking again." };

  // Re-derive the corridor and coverage server-side; never trust the client's numbers.
  const corridor = buildRunCorridor((workout as any).route.coordinates);
  if (!corridor) return { error: "Couldn't read this run's route." };
  const coverage = coverageRatio(corridor.geometry, territory.geometry as TerritoryGeometry);
  if (coverage < ATTACK_COVERAGE_THRESHOLD) {
    return { error: `Your run covered ${Math.round(coverage * 100)}% of this territory — attacks need at least ${ATTACK_COVERAGE_THRESHOLD * 100}%.` };
  }

  const battle = await Battle.create({
    attackerId: attacker._id,
    defenderId: territory.ownerId,
    territoryId,
    attackRunId: workout._id,
    attackCorridor: corridor.geometry,
    coverageRatio: Math.round(coverage * 100) / 100,
    proposedMetric,
    status: "PENDING_RESPONSE",
    respondBy: new Date(Date.now() + RESPOND_HOURS * 3600e3),
  });

  // Fog of war: the defender learns WHO and WHERE — never the run behind it.
  await notify(
    territory.ownerId,
    "ATTACK_INCOMING",
    `${attacker.name ?? "Someone"} is attacking ${territory.name}`,
    `Respond within ${RESPOND_HOURS}h: refuse (the land gets split) or accept a ${proposedMetric.toLowerCase()} battle. Their run stats are hidden.`,
    { battleId: battle._id, territoryId: territory._id },
  );

  return { battleId: String(battle._id) };
}

// ---------------------------------------------------------------------------
// Defender response
// ---------------------------------------------------------------------------

export async function respondToBattle(
  defenderId: string,
  battleId: string,
  response:
    | { action: "REFUSE" }
    | { action: "ACCEPT_ASYNC"; metric?: BattleMetric }
    | { action: "ACCEPT_DUEL"; metric: BattleMetric; windowStart: string; windowEnd: string },
): Promise<{ ok: true } | { error: string }> {
  const battle = await Battle.findById(battleId);
  if (!battle) return { error: "Battle not found." };
  if (String(battle.defenderId) !== defenderId) return { error: "Only the territory owner can respond." };
  if (battle.status !== "PENDING_RESPONSE") return { error: "This battle has already been responded to." };

  if (response.action === "REFUSE") {
    const resolved = await resolveRefusal(battle._id);
    return resolved ? { ok: true } : { error: "Could not resolve — try again." };
  }

  if (response.action === "ACCEPT_ASYNC") {
    battle.mode = "ASYNC";
    battle.status = "ASYNC_ACTIVE";
    battle.asyncMetric = response.metric ?? battle.proposedMetric;
    battle.asyncDeadline = new Date(Date.now() + ASYNC_HOURS * 3600e3);
    await battle.save();

    const minKm = battle.asyncMetric === "PACE" ? PACE_MIN_KM : DISTANCE_MIN_KM;
    const brief = `${battle.asyncMetric === "PACE" ? "Best pace" : "Longest distance"} wins. Run at least ${minKm}km inside the territory within ${ASYNC_HOURS}h.`;
    await notify(battle.attackerId, "BATTLE_ACCEPTED", "Your attack was accepted — open challenge", brief, {
      battleId: battle._id,
      territoryId: battle.territoryId,
    });
    await notify(battle.defenderId, "BATTLE_ACCEPTED", "Challenge on — defend your land", brief, {
      battleId: battle._id,
      territoryId: battle.territoryId,
    });
    return { ok: true };
  }

  // ACCEPT_DUEL
  const start = new Date(response.windowStart);
  const end = new Date(response.windowEnd);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: "Invalid duel window dates." };
  if (start < new Date()) return { error: "The duel window must start in the future." };
  if (start > new Date(Date.now() + DUEL_MAX_START_DAYS * 86400e3)) {
    return { error: `The duel must start within ${DUEL_MAX_START_DAYS} days.` };
  }
  const windowHours = (end.getTime() - start.getTime()) / 3600e3;
  if (windowHours < DUEL_MIN_WINDOW_HOURS || windowHours > DUEL_MAX_WINDOW_HOURS) {
    return { error: `The duel window must be between ${DUEL_MIN_WINDOW_HOURS} and ${DUEL_MAX_WINDOW_HOURS} hours long.` };
  }

  battle.mode = "DUEL";
  battle.status = "DUEL_SCHEDULED";
  battle.duelMetric = response.metric;
  battle.duelWindowStart = start;
  battle.duelWindowEnd = end;
  await battle.save();

  const when = `${start.toLocaleString()} – ${end.toLocaleString()}`;
  const brief = `Both of you must run in the territory during ${when}. ${response.metric === "PACE" ? "Best pace" : "Longest distance"} takes the land. Miss it and the land transfers automatically.`;
  await notify(battle.attackerId, "DUEL_SCHEDULED", "Duel scheduled — show up or lose", brief, {
    battleId: battle._id,
    territoryId: battle.territoryId,
  });
  await notify(battle.defenderId, "DUEL_SCHEDULED", "Duel scheduled — defend in person", brief, {
    battleId: battle._id,
    territoryId: battle.territoryId,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Resolutions
// ---------------------------------------------------------------------------

/** Owner refused (or ignored for 48h): the land is divided and its value decays. */
export async function resolveRefusal(battleId: unknown): Promise<boolean> {
  const battle = await claimResolution(battleId, "PENDING_RESPONSE");
  if (!battle) return false;

  const territory = await Territory.findById(battle.territoryId);
  const attackRun = await Workout.findById(battle.attackRunId).lean();
  const attacker = await User.findById(battle.attackerId).select("name").lean();

  battle.mode = "REFUSED";
  battle.resolution = "SPLIT";

  if (territory && attackRun) {
    const attackerStats: RunStats = attackRun as any;
    const defenderStats: RunStats = territory.claimStats as any;

    // Server-side comparison on the attacker's proposed metric — never revealed until now.
    const attackerBetter = compareOnMetric(attackerStats, defenderStats, battle.proposedMetric) > 0;
    await award(
      battle.attackerId,
      attackerBetter ? "REFUSAL_BETTER" : "REFUSAL_WORSE",
      attackerBetter ? REFUSAL_BETTER_LOSS : REFUSAL_WORSE_LOSS,
      `battle:${battle._id}:REFUSAL_ATTACKER`,
      { battleId: battle._id, territoryId: territory._id },
    );
    await award(
      battle.defenderId,
      attackerBetter ? "REFUSAL_WORSE" : "REFUSAL_BETTER",
      attackerBetter ? REFUSAL_WORSE_LOSS : REFUSAL_BETTER_LOSS,
      `battle:${battle._id}:REFUSAL_DEFENDER`,
      { battleId: battle._id, territoryId: territory._id },
    );

    const split = splitTerritory(territory.geometry as TerritoryGeometry, battle.attackCorridor as TerritoryGeometry);
    const decayedTotal = Math.round(territory.valuePoints * REFUSAL_VALUE_KEEP);

    if (split && split.ownerPiece) {
      // Normal case: attacker takes the strip they ran; owner keeps the rest.
      const totalArea = split.attackerPiece.areaSqM + split.ownerPiece.areaSqM;
      const attackerValue = Math.round((decayedTotal * split.attackerPiece.areaSqM) / totalArea);

      const geo = await reverseGeocode(split.attackerPiece.centroid[1], split.attackerPiece.centroid[0]);
      const pieceName = geo?.road ?? geo?.district ?? `${(attacker as any)?.name ?? "Rival"}'s cut of ${territory.name}`;

      const attackerPieceDoc = await Territory.create({
        name: pieceName,
        ownerId: battle.attackerId,
        color: colorForUser(String(battle.attackerId)),
        geometry: split.attackerPiece.geometry,
        bbox: split.attackerPiece.bbox,
        centroid: { type: "Point", coordinates: split.attackerPiece.centroid },
        areaSqM: split.attackerPiece.areaSqM,
        valuePoints: attackerValue,
        claimRunId: battle.attackRunId,
        claimStats: {
          distanceKm: attackerStats.distanceKm,
          avgPaceMinPerKm: attackerStats.avgPaceMinPerKm,
          durationSeconds: (attackRun as any).durationSeconds,
          workoutDate: (attackRun as any).workoutDate,
        },
        parentTerritoryId: territory._id,
        shieldUntil: shieldDate(),
        distinctRunnerIds: [battle.attackerId],
        totalVisits: 1,
        fameScore: 11,
      });

      territory.geometry = split.ownerPiece.geometry;
      territory.bbox = split.ownerPiece.bbox;
      territory.centroid = { type: "Point", coordinates: split.ownerPiece.centroid };
      territory.areaSqM = split.ownerPiece.areaSqM;
      territory.valuePoints = decayedTotal - attackerValue;
      territory.shieldUntil = shieldDate();
      await territory.save();

      battle.resultTerritoryIds = [attackerPieceDoc._id, territory._id];
    } else {
      // The attack corridor covered essentially the whole territory — it changes hands
      // outright (still at the decayed value; refusing has a price either way).
      territory.ownerId = battle.attackerId;
      territory.color = colorForUser(String(battle.attackerId));
      territory.valuePoints = decayedTotal;
      territory.claimRunId = battle.attackRunId;
      territory.claimStats = {
        distanceKm: attackerStats.distanceKm,
        avgPaceMinPerKm: attackerStats.avgPaceMinPerKm,
        durationSeconds: (attackRun as any).durationSeconds,
        workoutDate: (attackRun as any).workoutDate,
      };
      territory.shieldUntil = shieldDate();
      await territory.save();
      battle.resultTerritoryIds = [territory._id];
    }

    battle.revealedStats = {
      attacker: {
        distanceKm: attackerStats.distanceKm,
        avgPaceMinPerKm: attackerStats.avgPaceMinPerKm,
        durationSeconds: (attackRun as any).durationSeconds,
        workoutDate: (attackRun as any).workoutDate,
      },
      defender: defenderStats,
    };
  }

  await battle.save();

  await notify(battle.attackerId, "TERRITORY_SPLIT", "The owner refused — the land was divided", "You took the ground you ran. Both sides lost points; the territory's value decayed.", {
    battleId: battle._id,
    territoryId: battle.territoryId,
  });
  await notify(battle.defenderId, "TERRITORY_SPLIT", "You refused — your territory was divided", "The attacker took the strip they ran through. Both sides lost points; the land's value decayed.", {
    battleId: battle._id,
    territoryId: battle.territoryId,
  });
  await revealAndNotify(battle, () => "Battle report ready");
  return true;
}

/** Hands a territory to a battle winner: new owner, color, claim run, and a shield. */
async function transferTerritory(territory: any, winnerId: unknown, winningRun: RunStats & { _id?: unknown }) {
  territory.ownerId = winnerId;
  territory.color = colorForUser(String(winnerId));
  if (winningRun._id) {
    territory.claimRunId = winningRun._id;
    territory.claimStats = {
      distanceKm: winningRun.distanceKm,
      avgPaceMinPerKm: winningRun.avgPaceMinPerKm,
      durationSeconds: winningRun.durationSeconds ?? 0,
      workoutDate: winningRun.workoutDate ?? new Date(),
    };
  }
  territory.shieldUntil = shieldDate();
  await territory.save();
}

async function recordWinLoss(winnerId: unknown, loserId: unknown) {
  await User.updateOne({ _id: winnerId }, { $inc: { battlesWon: 1 } });
  await User.updateOne({ _id: loserId }, { $inc: { battlesLost: 1 } });
}

async function loadEntryRun(entry: { runId: unknown } | null) {
  if (!entry) return null;
  return Workout.findById(entry.runId).select("distanceKm avgPaceMinPerKm durationSeconds workoutDate").lean();
}

/** Async challenge deadline: compare entries, or forfeit whoever never showed up. */
export async function resolveAsync(battleId: unknown): Promise<boolean> {
  const battle = await claimResolution(battleId, "ASYNC_ACTIVE");
  if (!battle) return false;

  const territory = await Territory.findById(battle.territoryId);
  const [attackerRun, defenderRun] = await Promise.all([
    loadEntryRun(battle.attackerEntry),
    loadEntryRun(battle.defenderEntry),
  ]);

  if (battle.attackerEntry && battle.defenderEntry) {
    const attackerWins =
      compareOnMetric(battle.attackerEntry, battle.defenderEntry, battle.asyncMetric as BattleMetric) > 0;
    const winnerId = attackerWins ? battle.attackerId : battle.defenderId;
    const loserId = attackerWins ? battle.defenderId : battle.attackerId;
    battle.resolution = attackerWins ? "ATTACKER_WIN" : "DEFENDER_WIN";
    battle.winnerId = winnerId;

    if (territory && attackerWins) {
      await transferTerritory(territory, winnerId, { ...(battle.attackerEntry.toObject?.() ?? battle.attackerEntry), ...(attackerRun as any), _id: battle.attackerEntry.runId });
    } else if (territory) {
      territory.shieldUntil = shieldDate();
      await territory.save();
    }
    await award(winnerId, "BATTLE_WIN", BATTLE_WIN_POINTS, `battle:${battle._id}:WIN`, {
      battleId: battle._id,
      territoryId: battle.territoryId,
    });
    await recordWinLoss(winnerId, loserId);
  } else if (battle.attackerEntry || battle.defenderEntry) {
    const attackerWins = Boolean(battle.attackerEntry);
    const winnerId = attackerWins ? battle.attackerId : battle.defenderId;
    const loserId = attackerWins ? battle.defenderId : battle.attackerId;
    battle.resolution = attackerWins ? "ATTACKER_WIN" : "DEFENDER_WIN";
    battle.winnerId = winnerId;

    if (territory && attackerWins) {
      await transferTerritory(territory, winnerId, { ...(battle.attackerEntry.toObject?.() ?? battle.attackerEntry), ...(attackerRun as any), _id: battle.attackerEntry.runId });
    } else if (territory) {
      territory.shieldUntil = shieldDate();
      await territory.save();
    }
    await award(winnerId, "BATTLE_WIN", BATTLE_WIN_POINTS, `battle:${battle._id}:WIN`, {
      battleId: battle._id,
      territoryId: battle.territoryId,
    });
    await recordWinLoss(winnerId, loserId);
  } else {
    // Nobody ran: no transfer, both bleed points (the attacker more — they started it).
    battle.resolution = "DOUBLE_FORFEIT";
    await award(battle.attackerId, "ASYNC_DOUBLE_FORFEIT", ASYNC_FORFEIT_ATTACKER_LOSS, `battle:${battle._id}:FORFEIT_ATTACKER`, {
      battleId: battle._id,
    });
    await award(battle.defenderId, "ASYNC_DOUBLE_FORFEIT", ASYNC_FORFEIT_DEFENDER_LOSS, `battle:${battle._id}:FORFEIT_DEFENDER`, {
      battleId: battle._id,
    });
    if (territory) {
      territory.shieldUntil = shieldDate();
      await territory.save();
    }
  }

  battle.revealedStats = {
    attacker: attackerRun ?? {},
    defender: defenderRun ?? {},
  };
  await battle.save();
  await revealAndNotify(battle, (side) => {
    if (battle.resolution === "DOUBLE_FORFEIT") return "Challenge expired — nobody ran";
    const won = String(battle.winnerId) === String(side === "attacker" ? battle.attackerId : battle.defenderId);
    return won ? "You won the challenge!" : "You lost the challenge";
  });
  return true;
}

/** Duel window closed: both ran → metric decides; one ran → walkover; none → both bleed. */
export async function resolveDuel(battleId: unknown): Promise<boolean> {
  const battle = await claimResolution(battleId, "DUEL_SCHEDULED");
  if (!battle) return false;

  const territory = await Territory.findById(battle.territoryId);
  const [attackerRun, defenderRun, attackRun] = await Promise.all([
    loadEntryRun(battle.attackerEntry),
    loadEntryRun(battle.defenderEntry),
    Workout.findById(battle.attackRunId).select("distanceKm avgPaceMinPerKm durationSeconds workoutDate").lean(),
  ]);
  // Snapshot the defender's original claim run BEFORE any transfer overwrites it — the
  // stat-penalty comparison below is specced against the runs that started this fight.
  const originalClaimStats: RunStats | null = territory ? { ...(territory.claimStats as any) } : null;

  if (battle.attackerEntry && battle.defenderEntry) {
    const attackerWins =
      compareOnMetric(battle.attackerEntry, battle.defenderEntry, battle.duelMetric as BattleMetric) > 0;
    const winnerId = attackerWins ? battle.attackerId : battle.defenderId;
    const loserId = attackerWins ? battle.defenderId : battle.attackerId;
    battle.resolution = attackerWins ? "ATTACKER_WIN" : "DEFENDER_WIN";
    battle.winnerId = winnerId;

    if (territory && attackerWins) {
      await transferTerritory(territory, winnerId, { ...(battle.attackerEntry.toObject?.() ?? battle.attackerEntry), ...(attackerRun as any), _id: battle.attackerEntry.runId });
    } else if (territory) {
      territory.shieldUntil = shieldDate();
      await territory.save();
    }
    await award(winnerId, "BATTLE_WIN", BATTLE_WIN_POINTS, `battle:${battle._id}:WIN`, {
      battleId: battle._id,
      territoryId: battle.territoryId,
    });
    await recordWinLoss(winnerId, loserId);

    // The duel's extra twist: the ORIGINAL runs (attack run vs claim run) are compared on
    // the duel metric, and whoever's was weaker pays a stat penalty on top.
    if (attackRun && originalClaimStats) {
      const attackerOriginalBetter =
        compareOnMetric(attackRun as any, originalClaimStats, battle.duelMetric as BattleMetric) > 0;
      const penalizedId = attackerOriginalBetter ? battle.defenderId : battle.attackerId;
      await award(penalizedId, "BATTLE_STAT_PENALTY", STAT_PENALTY_LOSS, `battle:${battle._id}:STAT_PENALTY`, {
        battleId: battle._id,
      });
    }
  } else if (battle.attackerEntry || battle.defenderEntry) {
    // Only one showed up in the window — automatic transfer to (or retention by) the runner.
    const attackerWins = Boolean(battle.attackerEntry);
    const winnerId = attackerWins ? battle.attackerId : battle.defenderId;
    const loserId = attackerWins ? battle.defenderId : battle.attackerId;
    battle.resolution = attackerWins ? "ATTACKER_WIN" : "DEFENDER_WIN";
    battle.winnerId = winnerId;

    if (territory && attackerWins) {
      await transferTerritory(territory, winnerId, { ...(battle.attackerEntry.toObject?.() ?? battle.attackerEntry), ...(attackerRun as any), _id: battle.attackerEntry.runId });
    } else if (territory) {
      territory.shieldUntil = shieldDate();
      await territory.save();
    }
    await award(winnerId, "BATTLE_WIN", BATTLE_WIN_POINTS, `battle:${battle._id}:WIN`, {
      battleId: battle._id,
      territoryId: battle.territoryId,
    });
    await recordWinLoss(winnerId, loserId);
  } else {
    battle.resolution = "DOUBLE_FORFEIT";
    await award(battle.attackerId, "DUEL_DOUBLE_FORFEIT", DUEL_DOUBLE_FORFEIT_LOSS, `battle:${battle._id}:FORFEIT_ATTACKER`, {
      battleId: battle._id,
    });
    await award(battle.defenderId, "DUEL_DOUBLE_FORFEIT", DUEL_DOUBLE_FORFEIT_LOSS, `battle:${battle._id}:FORFEIT_DEFENDER`, {
      battleId: battle._id,
    });
    if (territory) {
      territory.shieldUntil = shieldDate();
      await territory.save();
    }
  }

  battle.revealedStats = {
    attacker: attackerRun ?? (attackRun as any) ?? {},
    defender: defenderRun ?? originalClaimStats ?? {},
  };
  await battle.save();
  await revealAndNotify(battle, (side) => {
    if (battle.resolution === "DOUBLE_FORFEIT") return "Duel expired — nobody showed";
    const won = String(battle.winnerId) === String(side === "attacker" ? battle.attackerId : battle.defenderId);
    return won ? "You won the duel!" : "You lost the duel";
  });
  return true;
}

// ---------------------------------------------------------------------------
// Qualifying-run auto-attach + sweep
// ---------------------------------------------------------------------------

/**
 * Called on every ingested run: if the runner is a participant in an active async/duel
 * battle and this run qualifies (inside the territory, meets the metric minimum, within
 * the window), it becomes — or improves — their entry. The opponent hears THAT a run
 * landed, never what it was.
 */
export async function attachQualifyingRunsToBattles(
  user: { _id: unknown },
  workout: {
    _id: unknown;
    distanceKm: number;
    avgPaceMinPerKm: number | null;
    workoutDate: Date;
    route?: { coordinates: [number, number][] } | null;
  },
) {
  if (!workout.route || !isTerritoryEligibleRun(workout as any)) return;

  const battles = await Battle.find({
    status: { $in: ["ASYNC_ACTIVE", "DUEL_SCHEDULED"] },
    $or: [{ attackerId: user._id }, { defenderId: user._id }],
  }).populate("territoryId", "geometry name");

  for (const battle of battles) {
    const isAttacker = String(battle.attackerId) === String(user._id);
    const metric = (battle.status === "ASYNC_ACTIVE" ? battle.asyncMetric : battle.duelMetric) as BattleMetric;

    if (battle.status === "ASYNC_ACTIVE") {
      if (!battle.asyncDeadline || workout.workoutDate > battle.asyncDeadline || new Date() > battle.asyncDeadline) continue;
    } else {
      if (!battle.duelWindowStart || !battle.duelWindowEnd) continue;
      if (workout.workoutDate < battle.duelWindowStart || workout.workoutDate > battle.duelWindowEnd) continue;
    }

    const minKm = metric === "PACE" ? PACE_MIN_KM : DISTANCE_MIN_KM;
    if (workout.distanceKm < minKm) continue;

    const territoryGeometry = (battle.territoryId as any)?.geometry as TerritoryGeometry | undefined;
    if (!territoryGeometry || !runQualifiesInTerritory(workout.route.coordinates, territoryGeometry)) continue;

    const entry = {
      runId: workout._id,
      distanceKm: workout.distanceKm,
      avgPaceMinPerKm: workout.avgPaceMinPerKm,
      submittedAt: new Date(),
    };
    const existing = isAttacker ? battle.attackerEntry : battle.defenderEntry;
    if (existing && compareOnMetric(existing, entry, metric) >= 0) continue; // current entry is already better

    if (isAttacker) battle.attackerEntry = entry;
    else battle.defenderEntry = entry;
    await battle.save();

    const opponentId = isAttacker ? battle.defenderId : battle.attackerId;
    await notify(
      opponentId,
      "OPPONENT_SUBMITTED",
      `Your rival logged a run for ${(battle.territoryId as any)?.name ?? "the contested territory"}`,
      "Their stats stay hidden until the battle resolves. Get your run in.",
      { battleId: battle._id, territoryId: (battle.territoryId as any)?._id },
    );
  }
}

/**
 * Resolves everything past its deadline. Called lazily from reads (battles/territories/
 * notifications GETs) and by POST /api/cron/resolve-battles — correctness never depends
 * on a scheduler being wired.
 */
export async function sweepBattles(scope?: { userId?: string }) {
  const now = new Date();
  const userFilter = scope?.userId
    ? { $or: [{ attackerId: scope.userId }, { defenderId: scope.userId }] }
    : {};

  const [expiredPending, expiredAsync, expiredDuels] = await Promise.all([
    Battle.find({ status: "PENDING_RESPONSE", respondBy: { $lt: now }, ...userFilter }).select("_id"),
    Battle.find({ status: "ASYNC_ACTIVE", asyncDeadline: { $lt: now }, ...userFilter }).select("_id"),
    Battle.find({ status: "DUEL_SCHEDULED", duelWindowEnd: { $lt: now }, ...userFilter }).select("_id"),
  ]);

  let resolved = 0;
  for (const b of expiredPending) if (await resolveRefusal(b._id)) resolved++;
  for (const b of expiredAsync) if (await resolveAsync(b._id)) resolved++;
  for (const b of expiredDuels) if (await resolveDuel(b._id)) resolved++;
  return resolved;
}
