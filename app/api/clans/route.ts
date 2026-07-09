import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";
import { getClanList } from "@/lib/clans";

export async function GET() {
  await connectDB();
  const clans = await getClanList();
  return NextResponse.json({ clans });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (me.clanId) return NextResponse.json({ error: "leave your current clan first" }, { status: 400 });

  const { name, tag, color, dietPactDescription } = await req.json();
  if (!name || name.length > 30) return NextResponse.json({ error: "name must be 1-30 chars" }, { status: 400 });
  if (!tag || tag.length !== 4) return NextResponse.json({ error: "tag must be exactly 4 characters" }, { status: 400 });

  const existing = await Clan.findOne({ tag: tag.toUpperCase() });
  if (existing) return NextResponse.json({ error: "tag already taken" }, { status: 409 });

  const clan = await Clan.create({
    name,
    tag: tag.toUpperCase(),
    leaderId: me._id,
    color: color ?? "#AE93F4",
    dietPactDescription: dietPactDescription ?? "",
  });

  await ClanMember.create({ clanId: clan._id, userId: me._id, role: "LEADER" });
  me.clanId = clan._id;
  await me.save();

  return NextResponse.json({ id: String(clan._id) });
}
