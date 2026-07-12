import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Notification } from "@/models/Notification";
import { sweepBattles } from "@/lib/battles";

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
    Notification.find(query).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    Notification.countDocuments({ userId: me._id, readAt: null }),
  ]);

  return NextResponse.json({
    notifications: items.map((n: any) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      data: {
        battleId: n.data?.battleId ? String(n.data.battleId) : null,
        territoryId: n.data?.territoryId ? String(n.data.territoryId) : null,
        workoutId: n.data?.workoutId ? String(n.data.workoutId) : null,
      },
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    unreadCount,
    nextCursor: items.length === PAGE_SIZE ? items[items.length - 1].createdAt : null,
  });
}
