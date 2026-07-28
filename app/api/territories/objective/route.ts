import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { abandonObjective, getActiveObjective, setObjective } from "@/lib/objectives";
import "@/models/User";

/** The runner's staked target for their next run — see lib/objectives.ts. */
export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ objective: await getActiveObjective(String(me._id)) });
}

export async function POST(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { territoryId, kind, label } = await req.json();
  if (kind !== "CLAIM" && kind !== "RAID" && kind !== "DEFEND") {
    return NextResponse.json({ error: "kind must be CLAIM, RAID or DEFEND" }, { status: 400 });
  }

  const result = await setObjective({
    userId: String(me._id),
    territoryId: territoryId ? String(territoryId) : null,
    kind,
    label: typeof label === "string" ? label.slice(0, 80) : undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ objective: result.objective });
}

export async function DELETE() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  await abandonObjective(String(me._id));
  return NextResponse.json({ ok: true });
}
