import { Notification, type NotificationType } from "@/models/Notification";

/**
 * Drops an item into a user's in-app inbox (the bell). v1 is deliberately pull-only —
 * no push — so this must never be load-bearing for correctness, only for awareness.
 * Failures are swallowed: a notification that didn't send shouldn't fail an ingest.
 */
export async function notify(
  userId: unknown,
  type: NotificationType,
  title: string,
  body = "",
  data: { battleId?: unknown; territoryId?: unknown; workoutId?: unknown } = {},
) {
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
      },
    });
  } catch (err) {
    console.error("[notifications] failed to create:", (err as Error).message);
  }
}
