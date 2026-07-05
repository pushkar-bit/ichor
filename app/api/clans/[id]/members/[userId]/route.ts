import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";
import { User } from "@/models/User";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id, userId } = await params;

  const clan = await Clan.findById(id);
  if (!clan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(clan.leaderId) !== String(me._id)) {
    return NextResponse.json({ error: "only the leader can kick members" }, { status: 403 });
  }
  if (String(userId) === String(me._id)) {
    return NextResponse.json({ error: "leader cannot kick themselves" }, { status: 400 });
  }

  await ClanMember.deleteOne({ clanId: id, userId });
  await User.updateOne({ _id: userId }, { clanId: null });

  return NextResponse.json({ ok: true });
}
