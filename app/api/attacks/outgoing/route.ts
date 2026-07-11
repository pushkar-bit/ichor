import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Attack } from "@/models/Attack";
import "@/models/CampusZone";
import "@/models/User";
import "@/models/GroupRun";

export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const attacks = await Attack.find({ attackerId: me._id, status: { $in: ["PENDING", "WAR"] } })
    .populate("defenderId")
    .populate("zoneId")
    .populate("warGroupRunId")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    attacks: attacks.map((a: any) => ({
      id: String(a._id),
      zoneName: a.zoneId?.name,
      zoneId: String(a.zoneId?._id ?? a.zoneId),
      defenderName: a.defenderId?.name,
      defenderAvatarUrl: a.defenderId?.avatarUrl,
      attackerScore: a.attackerScore,
      defenderScore: a.defenderScore,
      type: a.type,
      status: a.status,
      createdAt: a.createdAt,
      groupRun: a.warGroupRunId
        ? {
            id: String(a.warGroupRunId._id),
            sessionCode: a.warGroupRunId.sessionCode,
            startAt: a.warGroupRunId.startAt,
            windowEnd: a.warGroupRunId.windowEnd,
          }
        : null,
    })),
  });
}
