import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { ClanMember } from "@/models/Clan";
import { declareClanWar } from "@/lib/clanWars";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const membership = await ClanMember.findOne({ clanId: id, userId: me._id }).lean();
  if (!membership || (membership as { role?: string }).role !== "LEADER") {
    return NextResponse.json({ error: "only the clan leader can declare war" }, { status: 403 });
  }

  const { enemyClanId } = await req.json();
  if (!enemyClanId) return NextResponse.json({ error: "enemyClanId required" }, { status: 400 });

  try {
    const war = await declareClanWar(id, enemyClanId, me._id);
    return NextResponse.json({ id: String(war._id), endsAt: war.endsAt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
