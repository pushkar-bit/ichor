import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const clan = await Clan.findById(id);
  if (!clan) return NextResponse.json({ error: "not found" }, { status: 404 });

  await ClanMember.deleteOne({ clanId: id, userId: me._id });
  me.clanId = null;
  await me.save();

  if (String(clan.leaderId) === String(me._id)) {
    const nextLeader = await ClanMember.findOne({ clanId: id }).sort({ joinedAt: 1 });
    if (nextLeader) {
      nextLeader.role = "LEADER";
      await nextLeader.save();
      clan.leaderId = nextLeader.userId;
      await clan.save();
    } else {
      await Clan.deleteOne({ _id: id });
    }
  }

  return NextResponse.json({ ok: true });
}
