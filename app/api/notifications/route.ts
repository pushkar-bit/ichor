import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Notification } from "@/models/Notification";
import { hrefForNotification } from "@/lib/notifications";
import { sweepBattles } from "@/lib/battles";
import "@/models/User";

const PAGE_SIZE = 30;

/** The bell's inbox: newest first, plus the unread count for the badge. */
export async function GET(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Lazy expiry: the bell polls every minute, making it the de-facto scheduler — expired
  // battles resolve here so their outcome notifications land in this very response.
  await sweepBattles({ userId: String(me._id) });

  const cursor = req.nextUrl.searchParams.get("cursor");
  const query: Record<string, unknown> = { userId: me._id };
  if (cursor) query.createdAt = { $lt: new Date(cursor) };

  const [items, unreadCount] = await Promise.all([
    // The actor is populated so social items can deep-link to the right profile — a follow
    // notification that dumps you on the map is worse than no notification.
    Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate("data.actorId", "username name avatarUrl")
      .lean(),
    Notification.countDocuments({ userId: me._id, readAt: null }),
  ]);

  return NextResponse.json({
    notifications: items.map((n: any) => {
      const postId = n.data?.postId ? String(n.data.postId) : null;
      const clanId = n.data?.clanId ? String(n.data.clanId) : null;
      const groupRunId = n.data?.groupRunId ? String(n.data.groupRunId) : null;
      const actor = n.data?.actorId as { _id?: unknown; username?: string; name?: string; avatarUrl?: string } | null;
      return {
        id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body,
        href: hrefForNotification(n.type, { postId, clanId, groupRunId, actorUsername: actor?.username ?? null }),
        actor: actor?._id
          ? { id: String(actor._id), name: actor.name ?? "Athlete", avatarUrl: actor.avatarUrl ?? "" }
          : null,
        data: {
          battleId: n.data?.battleId ? String(n.data.battleId) : null,
          territoryId: n.data?.territoryId ? String(n.data.territoryId) : null,
          workoutId: n.data?.workoutId ? String(n.data.workoutId) : null,
          postId,
          clanId,
          groupRunId,
        },
        readAt: n.readAt,
        createdAt: n.createdAt,
      };
    }),
    unreadCount,
    nextCursor: items.length === PAGE_SIZE ? items[items.length - 1].createdAt : null,
  });
}
