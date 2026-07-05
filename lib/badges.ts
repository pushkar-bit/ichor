import { Post } from "@/models/Post";
import { Territory } from "@/models/Territory";

export const BADGE_DEFS: Record<string, { label: string; icon: string }> = {
  FIRST_WORKOUT: { label: "First Workout", icon: "Footprints" },
  STREAK_7: { label: "Streak 7", icon: "Flame" },
  STREAK_30: { label: "Streak 30", icon: "Flame" },
  CALORIE_KING: { label: "Calorie King", icon: "Crown" },
  CONQUEROR: { label: "Conqueror", icon: "Swords" },
  INTEGRITY_CHAMPION: { label: "Integrity Champion", icon: "ShieldCheck" },
  BATTLE_HARDENED: { label: "Battle Hardened", icon: "Trophy" },
};

type BadgeEligibleUser = {
  _id: unknown;
  badges?: string[];
  streakDays: number;
  battlesWon: number;
  integrityPoints: number;
};

/** Checks and returns newly-earned badge keys (does not persist — caller should push to user.badges). */
export async function evaluateBadges(user: BadgeEligibleUser): Promise<string[]> {
  const earned: string[] = [];
  const existing = new Set(user.badges || []);

  const postCount = await Post.countDocuments({ userId: user._id, isHidden: false });
  if (postCount >= 1 && !existing.has("FIRST_WORKOUT")) earned.push("FIRST_WORKOUT");

  if (user.streakDays >= 7 && !existing.has("STREAK_7")) earned.push("STREAK_7");
  if (user.streakDays >= 30 && !existing.has("STREAK_30")) earned.push("STREAK_30");

  const zonesHeld = await Territory.countDocuments({ ownerId: user._id });
  if (zonesHeld >= 5 && !existing.has("CONQUEROR")) earned.push("CONQUEROR");

  if (user.battlesWon >= 10 && !existing.has("BATTLE_HARDENED")) earned.push("BATTLE_HARDENED");

  if (user.integrityPoints >= 1500 && !existing.has("INTEGRITY_CHAMPION")) earned.push("INTEGRITY_CHAMPION");

  return earned;
}
