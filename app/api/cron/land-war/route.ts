import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { announceLandWarOpen, announceLandWarResult, getLandWarWindow } from "@/lib/landWar";

/**
 * Land War bookkeeping. Called on a schedule (or by hand); it works out for itself whether
 * the current moment is an opening or a closing, so one cron entry covers both ends of the
 * weekend window.
 *
 *   ?action=open    announce the window that's currently live
 *   ?action=result  post standings for the window that just closed
 *   (no action)     pick whichever fits the current time
 *
 * Nothing here is load-bearing: the bonus itself is paid inline on every qualifying run (see
 * awardLandWarCredit), and standings are summed from the ledger on read. This route only
 * sends the announcements.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectDB();
  const now = new Date();
  const current = getLandWarWindow(now);
  const requested = new URL(req.url).searchParams.get("action");
  const action = requested ?? (current.isOpen ? "open" : "result");

  if (action === "open") {
    if (!current.isOpen) return NextResponse.json({ ok: true, skipped: "no war window is open" });
    const notified = await announceLandWarOpen();
    return NextResponse.json({ ok: true, action, notified });
  }

  // Results belong to the window that just ended — a week back from the current one.
  const lastWeek = getLandWarWindow(new Date(now.getTime() - 7 * 86400e3));
  const finished = current.isOpen ? lastWeek : current;
  const standings = await announceLandWarResult(finished);
  return NextResponse.json({ ok: true, action: "result", weekKey: finished.weekKey, standings });
}
