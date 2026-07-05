import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";
import { computeAllWeeklyScores } from "@/lib/scoring";
import { Territory } from "@/models/Territory";

export async function GET() {
  await connectDB();
  const clans = await Clan.find({}).lean();
  const allScores = await computeAllWeeklyScores();

  const rows = await Promise.all(
    clans.map(async (clan: any) => {
      const members = await ClanMember.find({ clanId: clan._id }).lean();
      const memberIds = members.map((m: any) => String(m.userId));
      const combined = allScores
        .filter((r) => memberIds.includes(String(r.user._id)))
        .reduce((s, r) => s + r.score.finalScore, 0);
      const zonesHeld = await Territory.countDocuments({ clanId: clan._id });
      return {
        id: String(clan._id),
        name: clan.name,
        tag: clan.tag,
        color: clan.color,
        memberCount: members.length,
        score: combined + zonesHeld * 200,
        zonesHeld,
      };
    }),
  );

  return NextResponse.json({ clans: rows.sort((a, b) => b.score - a.score).slice(0, 20) });
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
