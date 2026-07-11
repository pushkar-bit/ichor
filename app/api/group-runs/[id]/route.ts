import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { GroupRun } from "@/models/GroupRun";
import "@/models/User";
import "@/models/CampusZone";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const groupRun = await GroupRun.findById(id)
    .populate("hostId")
    .populate("territoryId")
    .populate("participants.userId")
    .populate("results.leaderboard.userId")
    .lean();
  if (!groupRun) return NextResponse.json({ error: "not found" }, { status: 404 });

  const g = groupRun as any;
  return NextResponse.json({
    id: String(g._id),
    title: g.title,
    sessionCode: g.sessionCode,
    type: g.type,
    status: g.status,
    zoneName: g.territoryId?.name ?? null,
    startAt: g.startAt,
    windowEnd: g.windowEnd,
    endedAt: g.endedAt,
    isParticipant: g.participants.some((p: any) => String(p.userId?._id ?? p.userId) === String(me._id)),
    participants: g.participants.map((p: any) => ({
      userId: String(p.userId?._id ?? p.userId),
      name: p.userId?.name ?? "Athlete",
      avatarUrl: p.userId?.avatarUrl ?? null,
      joinedAt: p.joinedAt,
      hasRun: Boolean(p.runId),
    })),
    results: g.results?.leaderboard?.length
      ? {
          leaderboard: g.results.leaderboard.map((l: any) => ({
            rank: l.rank,
            userId: String(l.userId?._id ?? l.userId),
            name: l.userId?.name ?? "Athlete",
            avatarUrl: l.userId?.avatarUrl ?? null,
            distanceKm: l.distanceKm,
            avgPaceMinPerKm: l.avgPaceMinPerKm,
            caloriesBurned: l.caloriesBurned,
            runScore: l.runScore,
          })),
          groupStats: g.results.groupStats,
        }
      : null,
  });
}
