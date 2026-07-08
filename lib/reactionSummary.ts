import { Post } from "@/models/Post";
import { ClanMember } from "@/models/Clan";
import { Follow } from "@/models/Follow";

export type InterestSets = {
  following: Set<string>;
  clanmates: Set<string>;
  reactedToMe: Set<string>;
  iReactedTo: Set<string>;
};

/**
 * Computes the viewer's "who do they actually care about" signals once per request (feed
 * page or single post view), so picking a featured reactor per-post — or a follow
 * suggestion — is just cheap set lookups instead of a query per post/candidate. An explicit
 * follow is the strongest signal; clanmates (social circle) and reaction history (mutual or
 * one-sided interest) fill in for accounts the viewer hasn't explicitly followed yet.
 */
export async function getInterestSets(viewerId: string, viewerClanId?: unknown | null): Promise<InterestSets> {
  const [following, clanMembers, myPosts, reactedPosts] = await Promise.all([
    Follow.find({ followerId: viewerId }).select("followingId").lean(),
    viewerClanId ? ClanMember.find({ clanId: viewerClanId }).select("userId").lean() : Promise.resolve([]),
    Post.find({ userId: viewerId }).select("hypeUserIds respectUserIds challengeUserIds").lean(),
    Post.find({
      $or: [{ hypeUserIds: viewerId }, { respectUserIds: viewerId }, { challengeUserIds: viewerId }],
    })
      .select("userId")
      .lean(),
  ]);

  const followingSet = new Set((following as any[]).map((f) => String(f.followingId)));
  const clanmates = new Set((clanMembers as any[]).map((m) => String(m.userId)));

  const reactedToMe = new Set<string>();
  for (const p of myPosts as any[]) {
    for (const id of [...(p.hypeUserIds ?? []), ...(p.respectUserIds ?? []), ...(p.challengeUserIds ?? [])]) {
      reactedToMe.add(String(id));
    }
  }

  const iReactedTo = new Set((reactedPosts as any[]).map((p) => String(p.userId)));

  return { following: followingSet, clanmates, reactedToMe, iReactedTo };
}

/**
 * Combines a post's three reaction arrays into one de-duplicated, most-recent-first reactor
 * list. New reactions are pushed onto the end of each array, so walking each in reverse
 * surfaces the most recent reactors first.
 */
export function combineReactorIds(post: {
  hypeUserIds?: unknown[];
  respectUserIds?: unknown[];
  challengeUserIds?: unknown[];
}): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const arr of [post.hypeUserIds, post.respectUserIds, post.challengeUserIds]) {
    for (const id of (arr ?? []).slice().reverse()) {
      const s = String(id);
      if (!seen.has(s)) {
        seen.add(s);
        order.push(s);
      }
    }
  }
  return order;
}

/**
 * Picks who to name in "Liked by X and N others". The viewer themself always wins (matches
 * how Instagram shows "Liked by you and N others" when you're one of the reactors); otherwise
 * accounts the viewer explicitly follows outrank everything else (a deliberate follow is a
 * stronger signal than any inferred one), then clanmates > people who've reacted to the
 * viewer before > people the viewer has reacted to before > most recent reactor.
 */
export function pickFeaturedReactorId(reactorIds: string[], sets: InterestSets, viewerId?: string): string | null {
  if (reactorIds.length === 0) return null;
  if (viewerId && reactorIds.includes(viewerId)) return viewerId;

  let best = reactorIds[0];
  let bestScore = -1;
  for (const id of reactorIds) {
    const score = sets.following.has(id)
      ? 4
      : sets.clanmates.has(id)
        ? 3
        : sets.reactedToMe.has(id)
          ? 2
          : sets.iReactedTo.has(id)
            ? 1
            : 0;
    if (score > bestScore) {
      bestScore = score;
      best = id;
      if (score === 4) break;
    }
  }
  return best;
}
