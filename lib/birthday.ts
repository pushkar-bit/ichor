import { notify } from "./notifications";
import { isBirthdayToday } from "./age";

/**
 * Sends (at most once per year) a birthday-wish notification. Called from app/(app)/layout.tsx
 * on every authenticated request — cheap on every non-birthday day because the month/day check
 * below returns before any database work happens. On an actual birthday, notify()'s dedupeKey
 * (birthday:<userId>:<year>) hits the Notification model's unique index on repeat calls that
 * same day, so this is safe to call from every request without any extra bookkeeping.
 */
export async function checkAndSendBirthdayWish(user: { _id: unknown; name?: string; birthDate?: Date | null }, now: Date = new Date()) {
  if (!user.birthDate || !isBirthdayToday(user.birthDate, now)) return;

  const firstName = (user.name ?? "there").split(" ")[0];
  await notify(
    user._id,
    "BIRTHDAY",
    `Happy birthday, ${firstName}! 🎂`,
    "Everyone at ICHOR hopes you have a great one. However you spend today, it counts.",
    {},
    { dedupeKey: `birthday:${String(user._id)}:${now.getUTCFullYear()}` },
  );
}
