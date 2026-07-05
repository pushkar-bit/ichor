import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { Attack } from "@/models/Attack";
import { Territory } from "@/models/Territory";
import { resolveAttack } from "@/lib/territory";
import { computeUserWeeklyScore } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { zoneId, type, scheduledAt } = await req.json();
  const territory = await Territory.findOne({ zoneId });
  if (!territory || !territory.ownerId) {
    return NextResponse.json({ error: "zone has no owner to attack" }, { status: 400 });
  }
  if (String(territory.ownerId) === String(me._id)) {
    return NextResponse.json({ error: "you already own this zone" }, { status: 400 });
  }

  const { finalScore: attackerScore } = await computeUserWeeklyScore(String(me._id));

  const attack = await Attack.create({
    attackerId: me._id,
    defenderId: territory.ownerId,
    zoneId,
    status: "PENDING",
    type: type ?? "STAT",
    attackerScore,
    defenderScore: territory.weeklyCalorieScore,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  });

  // If attacker's own weekly score already beats the defender's zone score, auto-resolve in their favor.
  if (attackerScore > territory.weeklyCalorieScore) {
    await resolveAttack(String(attack._id), String(me._id));
  }

  return NextResponse.json({ attackId: String(attack._id), status: attack.status });
}
