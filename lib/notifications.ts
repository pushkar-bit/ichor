import { Notification, type NotificationType } from "@/models/Notification";

/**
 * Drops an item into a user's in-app inbox (the bell). v1 is deliberately pull-only —
 * no push — so this must never be load-bearing for correctness, only for awareness.
 * Failures are swallowed: a notification that didn't send shouldn't fail an ingest.
 */

export type NotifyRefs = {
  battleId?: unknown;
  territoryId?: unknown;
  workoutId?: unknown;
  postId?: unknown;
  commentId?: unknown;
  clanId?: unknown;
  groupRunId?: unknown;
  actorId?: unknown;
};

export type NotifyOptions = {
  /**
   * Idempotency key. A duplicate insert hits the unique index and no-ops, which is what
   * keeps toggleable social actions (react/unreact, follow/unfollow) from ringing someone's
   * bell over and over. Omit for events that can only happen once anyway.
   */
  dedupeKey?: string;
};

export async function notify(
  userId: unknown,
  type: NotificationType,
  title: string,
  body = "",
  data: NotifyRefs = {},
  options: NotifyOptions = {},
): Promise<boolean> {
  // Nobody needs telling about their own actions.
  if (data.actorId && String(data.actorId) === String(userId)) return false;

  try {
    await Notification.create({
      userId,
      type,
      title,
      body,
      data: {
        battleId: data.battleId ?? null,
        territoryId: data.territoryId ?? null,
        workoutId: data.workoutId ?? null,
        postId: data.postId ?? null,
        commentId: data.commentId ?? null,
        clanId: data.clanId ?? null,
        groupRunId: data.groupRunId ?? null,
        actorId: data.actorId ?? null,
      },
      dedupeKey: options.dedupeKey ?? null,
    });
    return true;
  } catch (err) {
    // 11000 = already notified for this exact event; that's the guard doing its job.
    if ((err as { code?: number }).code !== 11000) {
      console.error("[notifications] failed to create:", (err as Error).message);
    }
    return false;
  }
}

/**
 * Where tapping an inbox item should land. Resolved server-side (see /api/notifications) so
 * the client stays dumb — and so a type added later can't silently keep routing to /map,
 * which is what every notification used to do regardless of what it was about.
 */
export function hrefForNotification(
  type: NotificationType,
  refs: { postId?: string | null; clanId?: string | null; groupRunId?: string | null; actorUsername?: string | null },
): string {
  switch (type) {
    case "FOLLOW":
      return refs.actorUsername ? `/profile/${refs.actorUsername}` : "/search";
    case "POST_REACTION":
    case "POST_COMMENT":
    case "COMMENT_REPLY":
      return refs.postId ? `/post/${refs.postId}` : "/feed";
    case "CLAN_JOIN":
      return refs.clanId ? `/clans/${refs.clanId}` : "/clans";
    case "GROUP_RUN_JOIN":
      return refs.groupRunId ? `/group-run/${refs.groupRunId}` : "/clans";
    case "LAND_WAR_OPEN":
    case "LAND_WAR_RESULT":
      return "/map";
    default:
      // Everything territory- and battle-shaped lives on the map.
      return "/map";
  }
}
