import { Territory } from "@/models/Territory";
import { Battle } from "@/models/Battle";
import { notify } from "./notifications";
import { award, HOLD_STREAK_POINTS_PER_MILESTONE } from "./points";

/**
 * Upkeep: land is held, not owned.
 *
 * Before this existed a territory was permanent — early runners locked in their ground and a
 * late joiner opened the map to a wall of land that could never move. Upkeep makes holding
 * an ongoing act: ground nobody runs through goes quiet, fades, and eventually returns to
 * unclaimed, while ground you keep running refills its value (the recovery half lives in
 * bumpFame, lib/territoryEngine.ts).
 *
 * Deliberately slow and loudly telegraphed — a decay mechanic that surprises people reads as
 * punishment. A territory gets a full week untouched before anything happens at all, then a
 * warning notification, then a visible fade, and only after more than a month of total
 * silence does it go neutral.
 *
 * The same sweep pays hold streaks, because they're two readings of one number: how long has
 * this ground been yours, and how long since anyone ran it.
 */

const DAY_MS = 86400e3;

/** Untouched for less than this and nothing happens at all. */
export const GRACE_DAYS = 7;
/** Past GRACE_DAYS, each further quiet day drains this fraction of the land's peak value. */
const DECAY_RATE_PER_DAY = 0.03;
/** Value can never decay below this share of peak — quiet land fades, it doesn't evaporate. */
const DECAY_FLOOR_RATIO = 0.25;
/** Fully quiet for this long and the land returns to unclaimed. */
export const DORMANT_DAYS = 35;
/** Hold-streak milestones, in days. Paid once each per unbroken hold (holdMilestoneDays). */
const HOLD_MILESTONES = [7, 30, 100];

export type DecayState = "ACTIVE" | "FADING" | "DORMANT";

/**
 * Derived, never stored: a stored copy would be a second source of truth that goes stale
 * between sweeps. Every read (map, feed card, profile) computes it from lastActivityAt, so
 * the map is honest even if the cron hasn't run.
 */
export function decayStateFor(lastActivityAt: Date | string | null | undefined, now = new Date()): DecayState {
  if (!lastActivityAt) return "ACTIVE";
  const quietDays = (now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MS;
  if (quietDays >= DORMANT_DAYS) return "DORMANT";
  if (quietDays > GRACE_DAYS) return "FADING";
  return "ACTIVE";
}

/** Whole days since anyone ran this land — the number every upkeep surface quotes. */
export function quietDays(lastActivityAt: Date | string | null | undefined, now = new Date()): number {
  if (!lastActivityAt) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MS));
}

/** Days the current owner has held this ground unbroken. */
export function holdDays(heldSince: Date | string | null | undefined, now = new Date()): number {
  if (!heldSince) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(heldSince).getTime()) / DAY_MS));
}

/** The value quiet land should currently be worth, given its peak and how long it's been quiet. */
export function decayedValue(peakValuePoints: number, quiet: number): number {
  if (quiet <= GRACE_DAYS) return peakValuePoints;
  const drained = (quiet - GRACE_DAYS) * DECAY_RATE_PER_DAY;
  const ratio = Math.max(DECAY_FLOOR_RATIO, 1 - drained);
  return Math.round(peakValuePoints * ratio);
}

type UpkeepTerritory = {
  _id: unknown;
  name: string;
  ownerId: unknown;
  valuePoints?: number;
  peakValuePoints?: number;
  lastActivityAt?: Date;
  heldSince?: Date;
  holdMilestoneDays?: number;
};

export type UpkeepResult = {
  faded: number;
  wentDormant: number;
  streaksPaid: number;
};

/**
 * One upkeep pass over every claimed territory. Idempotent by construction: decay recomputes
 * an absolute target value from peak + quiet days rather than subtracting a delta, so running
 * this twice in a day (or twice in a minute) lands on exactly the same number. Hold-streak
 * payouts are guarded by both `holdMilestoneDays` on the doc and the ledger's unique key.
 *
 * Territories in an active battle are skipped entirely — land can't rot out from under a
 * fight that's already contesting it.
 */
export async function runTerritoryUpkeep({ now = new Date() }: { now?: Date } = {}): Promise<UpkeepResult> {
  const result: UpkeepResult = { faded: 0, wentDormant: 0, streaksPaid: 0 };

  const contested = await Battle.find({ status: { $ne: "RESOLVED" } }).select("territoryId").lean();
  const contestedIds = new Set(contested.map((b: { territoryId: unknown }) => String(b.territoryId)));

  const territories = (await Territory.find({})
    .select("name ownerId valuePoints peakValuePoints lastActivityAt heldSince holdMilestoneDays")
    .lean()) as unknown as UpkeepTerritory[];

  for (const t of territories) {
    if (contestedIds.has(String(t._id))) continue;

    const quiet = quietDays(t.lastActivityAt, now);
    const peak = t.peakValuePoints ?? t.valuePoints ?? 0;

    // --- Dormancy: the land goes back to the map for anyone to take. ---
    if (quiet >= DORMANT_DAYS) {
      await Territory.deleteOne({ _id: t._id });
      result.wentDormant++;
      await notify(
        t.ownerId,
        "TERRITORY_DORMANT",
        `${t.name} went dormant`,
        `Nobody has run it in ${quiet} days, so it's back to unclaimed ground. Run it again to take it back.`,
        { territoryId: t._id },
      );
      continue;
    }

    // --- Decay: quiet land loses value toward the floor. ---
    if (quiet > GRACE_DAYS) {
      const target = decayedValue(peak, quiet);
      if (target < (t.valuePoints ?? peak)) {
        const lost = (t.valuePoints ?? peak) - target;
        await Territory.updateOne({ _id: t._id }, { valuePoints: target });
        result.faded++;

        // The owner pays for the decline, but only ever once per territory per day — the
        // uniqueKey embeds the day so a re-run of the sweep can't bill the same fade twice.
        await award(t.ownerId, "TERRITORY_DECAY", -Math.round(lost / 10), `decay:${t._id}:${dayKey(now)}`, {
          territoryId: t._id,
        });

        // One warning, on the first day past grace — not a daily nag.
        if (quiet === GRACE_DAYS + 1) {
          await notify(
            t.ownerId,
            "TERRITORY_FADING",
            `${t.name} is fading`,
            `No one has run this ground in a week, so it's started losing value. It returns to unclaimed after ${DORMANT_DAYS} quiet days — a single run through it resets the clock.`,
            { territoryId: t._id },
          );
        }
      }
    }

    // --- Hold streaks: unbroken ownership of the same ground. ---
    const held = holdDays(t.heldSince, now);
    const alreadyPaid = t.holdMilestoneDays ?? 0;
    const earned = HOLD_MILESTONES.filter((m) => held >= m && m > alreadyPaid);
    for (const milestone of earned) {
      const points = HOLD_STREAK_POINTS_PER_MILESTONE[milestone] ?? 0;
      const paid = await award(t.ownerId, "HOLD_STREAK_BONUS", points, `hold:${t._id}:${milestone}`, {
        territoryId: t._id,
      });
      if (paid) {
        result.streaksPaid++;
        await notify(
          t.ownerId,
          "HOLD_STREAK",
          `${milestone} days holding ${t.name}`,
          `Nobody has taken it off you. +${points} points.`,
          { territoryId: t._id },
        );
      }
    }
    if (earned.length > 0) {
      await Territory.updateOne({ _id: t._id }, { holdMilestoneDays: Math.max(...earned) });
    }
  }

  return result;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
