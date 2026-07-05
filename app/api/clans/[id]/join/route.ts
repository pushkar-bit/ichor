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

  const count = await ClanMember.countDocuments({ clanId: id });
  if (count >= 10) return NextResponse.json({ error: "clan is full (max 10)" }, { status: 400 });

  if (me.clanId) {
    await ClanMember.deleteOne({ clanId: me.clanId, userId: me._id });
  }

  await ClanMember.create({ clanId: id, userId: me._id, role: "MEMBER" });
  me.clanId = clan._id;
  await me.save();

  return NextResponse.json({ ok: true });
}
