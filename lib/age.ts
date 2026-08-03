/**
 * Age helpers derived from User.birthDate. Kept intentionally minimal — this powers pacing
 * defaults and notification timing, never anything that reads as medical guidance.
 */

/** Whole years as of `now` — the standard "have they had this year's birthday yet" calculation. */
export function getAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const hadBirthdayThisYear =
    now.getUTCMonth() > birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate());
  if (!hadBirthdayThisYear) age--;
  return age;
}

/**
 * Minimum calendar days required between two counted beginner-program sessions (see
 * lib/beginnerProgram.ts's computeProgramProgress). General exercise-science consensus is that
 * recovery time between new-to-you activity needs increase with age — this is a pacing default,
 * not a diagnosis, and only ever widens the safety floor, never narrows it. No birth date on
 * file (Strava signups often lack one) falls back to the standard gap.
 */
export function minRestDaysForAge(age: number | null): number {
  if (age === null) return 2;
  if (age >= 50) return 3;
  return 2;
}

/** True when `birthDate`'s month/day matches `now`'s — deliberately ignores year. */
export function isBirthdayToday(birthDate: Date, now: Date = new Date()): boolean {
  return now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() === birthDate.getUTCDate();
}
