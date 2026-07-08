import { User } from "@/models/User";
import { getInterestSets } from "./reactionSummary";

export type FollowSuggestion = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string;
  followerCount: number;
  reason: "clanmate" | "reacted_to_you" | "you_reacted" | "popular";
};

/**
 * Ranks candidate profiles to suggest following, reusing the same interest signals as the
 * "Liked by X" summary: clanmates outrank people who've reacted to the viewer's posts, who
 * outrank people the viewer has reacted to, all of which outrank a popularity fallback used
 * to fill remaining slots so the widget never shows fewer than requested (while there are
 * enough other users to show).
 */
export async function getFollowSuggestions(
  viewerId: string,
  viewerClanId: unknown | null | undefined,
  limit = 5,
): Promise<FollowSuggestion[]> {
  const sets = await getInterestSets(viewerId, viewerClanId);
  const excludeIds = new Set([viewerId, ...sets.following]);

  const scored = new Map<string, { score: number; reason: FollowSuggestion["reason"] }>();
  const consider = (id: string, score: number, reason: FollowSuggestion["reason"]) => {
    if (excludeIds.has(id)) return;
    const existing = scored.get(id);
    if (!existing || score > existing.score) scored.set(id, { score, reason });
  };
  for (const id of sets.clanmates) consider(id, 3, "clanmate");
  for (const id of sets.reactedToMe) consider(id, 2, "reacted_to_you");
  for (const id of sets.iReactedTo) consider(id, 1, "you_reacted");

  let candidateIds = [...scored.entries()].sort((a, b) => b[1].score - a[1].score).map(([id]) => id);

  if (candidateIds.length < limit) {
    const fillExcludeIds = [...excludeIds, ...candidateIds];
    const popular = await User.find({ _id: { $nin: fillExcludeIds } })
      .sort({ followerCount: -1, totalWorkouts: -1 })
      .limit(limit - candidateIds.length)
      .select("_id")
      .lean();
    for (const u of popular as any[]) {
      const id = String(u._id);
      scored.set(id, { score: 0, reason: "popular" });
      candidateIds.push(id);
    }
  }

  candidateIds = candidateIds.slice(0, limit);
  if (candidateIds.length === 0) return [];

  const users = await User.find({ _id: { $in: candidateIds } })
    .select("name username avatarUrl followerCount")
    .lean();
  const userById = new Map((users as any[]).map((u) => [String(u._id), u]));

  return candidateIds
    .map((id) => {
      const u = userById.get(id);
      if (!u) return null;
      return {
        id,
        name: u.name ?? "Athlete",
        username: u.username ?? null,
        avatarUrl: u.avatarUrl ?? "",
        followerCount: u.followerCount ?? 0,
        reason: scored.get(id)!.reason,
      };
    })
    .filter((s): s is FollowSuggestion => s !== null);
}
