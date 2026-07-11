import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Attack } from "@/models/Attack";
import { resolveAttack } from "@/lib/territory";
import { createWarGroupRun } from "@/lib/groupRun";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;
  const { action } = await req.json();

  const attack = await Attack.findById(id);
  if (!attack) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (String(attack.defenderId) !== String(me._id)) {
    return NextResponse.json({ error: "only the defender can respond" }, { status: 403 });
  }
  if (attack.status !== "PENDING") {
    return NextResponse.json({ error: "attack already resolved" }, { status: 400 });
  }

  if (action === "FORFEIT") {
    attack.status = "FORFEITED";
    attack.resolvedAt = new Date();
    await attack.save();
    await resolveAttack(id, String(attack.attackerId));
    return NextResponse.json({ status: attack.status });
  }

  if (action === "DEFEND") {
    // Immediate stat-battle resolution — the defender's zone score against the attacker's
    // triggering run (already includes any fresh-run bonus from claimOrContestZone).
    const winnerId = attack.defenderScore >= attack.attackerScore ? attack.defenderId : attack.attackerId;
    const resolved = await resolveAttack(id, String(winnerId));
    return NextResponse.json({ status: resolved?.status, winnerId: resolved?.winnerId });
  }

  if (action === "WAR") {
    const groupRun = await createWarGroupRun({
      attackId: id,
      hostId: String(attack.defenderId),
      zoneId: String(attack.zoneId),
    });
    attack.status = "WAR";
    attack.warGroupRunId = groupRun._id;
    attack.scheduledAt = groupRun.startAt;
    await attack.save();
    return NextResponse.json({
      status: attack.status,
      groupRunId: String(groupRun._id),
      sessionCode: groupRun.sessionCode,
      startAt: groupRun.startAt,
      windowEnd: groupRun.windowEnd,
    });
  }

  return NextResponse.json({ error: "action must be DEFEND, WAR, or FORFEIT" }, { status: 400 });
}
