import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Attack } from "@/models/Attack";
import { CampusZone } from "@/models/CampusZone";
import "@/models/User";

export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const attacks = await Attack.find({ defenderId: me._id, status: "PENDING" })
    .populate("attackerId")
    .populate("zoneId")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    attacks: attacks.map((a: any) => ({
      id: String(a._id),
      zoneName: a.zoneId?.name,
      zoneId: String(a.zoneId?._id ?? a.zoneId),
      attackerName: a.attackerId?.name,
      attackerAvatarUrl: a.attackerId?.avatarUrl,
      attackerScore: a.attackerScore,
      defenderScore: a.defenderScore,
      type: a.type,
      createdAt: a.createdAt,
    })),
  });
}
