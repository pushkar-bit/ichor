import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Clan, ClanMember } from "@/models/Clan";
import { Territory } from "@/models/Territory";
import { Attack } from "@/models/Attack";
import { computeUserWeeklyScore } from "@/lib/scoring";
import "@/models/User";
import "@/models/CampusZone";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const clan = await Clan.findById(id).lean();
  if (!clan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const members = await ClanMember.find({ clanId: id }).populate("userId").sort({ role: 1, joinedAt: 1 }).lean();
  const memberRows = await Promise.all(
    members.map(async (m: any) => {
      const score = await computeUserWeeklyScore(String(m.userId._id));
      return {
        userId: String(m.userId._id),
        name: m.userId.name,
        avatarUrl: m.userId.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
        weeklyScore: score.finalScore,
      };
    }),
  );

  const territories = await Territory.find({ clanId: id }).populate("zoneId").lean();
  const memberIds = members.map((m: any) => String(m.userId._id));
  const attacks = await Attack.find({
    status: "PENDING",
    $or: [{ attackerId: { $in: memberIds } }, { defenderId: { $in: memberIds } }],
  })
    .populate("zoneId")
    .populate("attackerId")
    .populate("defenderId")
    .lean();

  return NextResponse.json({
    id: String((clan as any)._id),
    name: (clan as any).name,
    tag: (clan as any).tag,
    color: (clan as any).color,
    leaderId: String((clan as any).leaderId),
    dietPactDescription: (clan as any).dietPactDescription,
    battlesWon: (clan as any).battlesWon,
    members: memberRows,
    territory: territories.map((t: any) => ({ zoneName: t.zoneId?.name, weeklyCalorieScore: t.weeklyCalorieScore })),
    activeAttacks: attacks.map((a: any) => ({
      id: String(a._id),
      zoneName: a.zoneId?.name,
      attackerName: a.attackerId?.name,
      defenderName: a.defenderId?.name,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const clan = await Clan.findById(id);
  if (!clan) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(clan.leaderId) !== String(me._id)) {
    return NextResponse.json({ error: "only the leader can edit the clan" }, { status: 403 });
  }

  const body = await req.json();
  if (body.name) clan.name = body.name;
  if (body.color) clan.color = body.color;
  if (typeof body.dietPactDescription === "string") clan.dietPactDescription = body.dietPactDescription;
  if (body.tag && body.tag.length === 4) clan.tag = body.tag.toUpperCase();
  await clan.save();

  return NextResponse.json({ ok: true });
}
