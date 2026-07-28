import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { joinGroupRun } from "@/lib/groupRun";
import { notify } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const groupRun = await joinGroupRun(id, String(me._id));
  if (!groupRun) return NextResponse.json({ error: "group run not found or already ended" }, { status: 404 });

  // The host is the one waiting to see whether anyone actually turns up.
  await notify(
    groupRun.hostId,
    "GROUP_RUN_JOIN",
    `${me.name ?? "A runner"} joined ${groupRun.title}`,
    `${groupRun.participants.length} runner${groupRun.participants.length === 1 ? "" : "s"} in the lobby.`,
    { groupRunId: groupRun._id, actorId: me._id },
    { dedupeKey: `grjoin:${String(me._id)}:${id}` },
  );

  return NextResponse.json({ status: groupRun.status });
}
