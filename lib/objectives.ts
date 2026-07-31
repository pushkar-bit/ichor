import { Objective } from "@/models/Objective";
import { Territory } from "@/models/Territory";
import { notify } from "./notifications";
import type { TerritoryRunResult } from "./territoryEngine";

/**
 * Objectives — the missing "before".
 *
 * Claiming is automatic: you run, and afterwards you're told what you took. That's a fine
 * reward and a poor *anticipation* — nothing in the loop ever lets a runner say "this is the
 * ground I'm going for today" and then go earn it. An objective is that declaration. It
 * changes no gameplay math whatsoever; it exists so the run has a stake the runner chose.
 *
 * One open objective at a time (DB-enforced), and it lapses — this is a promise about the
 * next run or two, not a backlog.
 */

const DEFAULT_TTL_DAYS = 3;

export type ObjectiveKind = "CLAIM" | "RAID" | "DEFEND";

export type ActiveObjective = {
  id: string;
  kind: ObjectiveKind;
  label: string;
  territoryId: string | null;
  expiresAt: string;
};

type StoredObjective = {
  _id: unknown;
  kind: ObjectiveKind;
  label: string;
  territoryId: unknown;
  expiresAt: Date;
};

/** The viewer's open objective, if it hasn't lapsed. Expiry is lazy — no scheduler needed. */
export async function getActiveObjective(userId: string): Promise<ActiveObjective | null> {
  const objective = (await Objective.findOne({ userId, status: "OPEN" }).lean()) as StoredObjective | null;
  if (!objective) return null;

  if (new Date(objective.expiresAt) < new Date()) {
    await Objective.updateOne({ _id: objective._id }, { status: "EXPIRED" });
    return null;
  }

  return {
    id: String(objective._id),
    kind: objective.kind,
    label: objective.label,
    territoryId: objective.territoryId ? String(objective.territoryId) : null,
    expiresAt: new Date(objective.expiresAt).toISOString(),
  };
}

/**
 * Stakes a target. Replaces any existing open objective rather than erroring — changing your
 * mind about what you're chasing shouldn't require a separate "abandon" step.
 */
export async function setObjective(params: {
  userId: string;
  territoryId: string | null;
  kind: ObjectiveKind;
  label?: string;
  ttlDays?: number;
}): Promise<{ ok: true; objective: ActiveObjective } | { ok: false; error: string }> {
  const { userId, territoryId, kind, ttlDays = DEFAULT_TTL_DAYS } = params;

  let label = params.label ?? null;
  if (territoryId) {
    const territory = (await Territory.findById(territoryId).select("name ownerId").lean()) as {
      name: string;
      ownerId: unknown;
    } | null;
    if (!territory) return { ok: false, error: "That land no longer exists." };
    if (kind === "RAID" && String(territory.ownerId) === userId) {
      return { ok: false, error: "You already hold that land — defend it instead." };
    }
    if (kind === "DEFEND" && String(territory.ownerId) !== userId) {
      return { ok: false, error: "You can only set a defence objective on land you hold." };
    }
    label = label ?? territory.name;
  }
  if (!label) return { ok: false, error: "An objective needs a target." };

  await Objective.updateMany({ userId, status: "OPEN" }, { status: "ABANDONED" });

  const doc = await Objective.create({
    userId,
    territoryId: territoryId ?? null,
    kind,
    label,
    status: "OPEN",
    expiresAt: new Date(Date.now() + ttlDays * 86400e3),
  });

  return {
    ok: true,
    objective: {
      id: String(doc._id),
      kind,
      label,
      territoryId: territoryId ?? null,
      expiresAt: doc.expiresAt.toISOString(),
    },
  };
}

export async function abandonObjective(userId: string): Promise<void> {
  await Objective.updateMany({ userId, status: "OPEN" }, { status: "ABANDONED" });
}

/**
 * Called from the gameplay pipeline with whatever the run just did to the map. Completes an
 * open objective when the run actually delivered it:
 *
 *   CLAIM  — any new ground claimed, or specifically the targeted (dormant) land
 *   RAID   — the run meaningfully crossed the targeted rival land, which is exactly the
 *            precondition an attack or raid needs, so the objective is "you got there"
 *   DEFEND — the run crossed the targeted land the user still holds
 *
 * Never throws into the ingest path: an objective is motivational, and a bug here must not
 * cost someone their run.
 */
export async function resolveObjectiveForRun(
  userId: string,
  workoutId: unknown,
  result: TerritoryRunResult,
): Promise<{ completedLabel: string } | null> {
  try {
    // A hydrated doc (not .lean()) — this path mutates and saves it.
    const objective = await Objective.findOne({ userId, status: "OPEN" });
    if (!objective) return null;
    if (new Date(objective.expiresAt) < new Date()) {
      objective.status = "EXPIRED";
      await objective.save();
      return null;
    }

    const targetId = objective.territoryId ? String(objective.territoryId) : null;
    const crossedTarget = targetId ? result.crossed.some((c) => c.territoryId === targetId) : false;

    let done = false;
    if (objective.kind === "CLAIM") {
      done = Boolean(result.claimed);
    } else if (objective.kind === "RAID") {
      done = crossedTarget;
    } else if (objective.kind === "DEFEND") {
      done = crossedTarget;
    }
    if (!done) return null;

    objective.status = "COMPLETED";
    objective.completedAt = new Date();
    objective.completedWorkoutId = workoutId;
    await objective.save();

    await notify(userId, "OBJECTIVE_COMPLETE", `Objective complete — ${objective.label}`, "You called your shot and ran it down.", {
      territoryId: objective.territoryId,
      workoutId,
    });

    return { completedLabel: objective.label };
  } catch (err) {
    console.error("[objectives] resolve failed:", (err as Error).message);
    return null;
  }
}
