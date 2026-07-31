import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Follow } from "@/models/Follow";
import { User } from "@/models/User";
import { notify } from "@/lib/notifications";
import { dayKey } from "@/lib/week";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id: targetId } = await params;
  if (targetId === String(me._id)) {
    return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });
  }

  const target = await User.findById(targetId).select("_id").lean();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const existing = await Follow.findOne({ followerId: me._id, followingId: targetId });

  if (existing) {
    await Follow.deleteOne({ _id: existing._id });
    await Promise.all([
      User.updateOne({ _id: me._id }, { $inc: { followingCount: -1 } }),
      User.updateOne({ _id: targetId }, { $inc: { followerCount: -1 } }),
    ]);
    return NextResponse.json({ following: false });
  }

  await Follow.create({ followerId: me._id, followingId: targetId });
  await Promise.all([
    User.updateOne({ _id: me._id }, { $inc: { followingCount: 1 } }),
    User.updateOne({ _id: targetId }, { $inc: { followerCount: 1 } }),
  ]);

  // Day-bucketed dedupe: unfollow/refollow can't be used to spam someone's bell, but a
  // genuine re-follow weeks later still gets through.
  await notify(
    targetId,
    "FOLLOW",
    `${me.name ?? "Someone"} followed you`,
    "Tap to see their profile — follow back to get their runs in your feed.",
    { actorId: me._id },
    { dedupeKey: `follow:${String(me._id)}:${targetId}:${dayKey(new Date())}` },
  );

  return NextResponse.json({ following: true });
}
