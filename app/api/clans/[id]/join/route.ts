import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";
import { notify } from "@/lib/notifications";

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

  // The leader is the one who cares that the roster changed. Dedupe on (member, clan) so
  // leaving and rejoining doesn't ping them repeatedly.
  await notify(
    clan.leaderId,
    "CLAN_JOIN",
    `${me.name ?? "A runner"} joined ${clan.name}`,
    `${count + 1} of 10 members. Every territory they hold now counts toward the empire.`,
    { clanId: clan._id, actorId: me._id },
    { dedupeKey: `clanjoin:${String(me._id)}:${id}` },
  );

  return NextResponse.json({ ok: true });
}
