import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Notification } from "@/models/Notification";

/** Marks notifications read: `{ ids: string[] }` for specific ones or `{ all: true }`. */
export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const now = new Date();

  if (body.all === true) {
    await Notification.updateMany({ userId: me._id, readAt: null }, { $set: { readAt: now } });
    return NextResponse.json({ ok: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    await Notification.updateMany(
      { _id: { $in: body.ids }, userId: me._id, readAt: null },
      { $set: { readAt: now } },
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "pass ids[] or all: true" }, { status: 400 });
}
