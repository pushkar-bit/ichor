import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { getDistrictStandings } from "@/lib/districts";
import { getLandWarStandings, getLandWarWindow } from "@/lib/landWar";
import "@/models/User";

/** District standings plus the current Land War state — the "local scope" panel on the map. */
export async function GET() {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  const myId = me ? String(me._id) : null;

  const window = getLandWarWindow();
  const [districts, warStandings] = await Promise.all([
    getDistrictStandings(myId),
    getLandWarStandings(window),
  ]);

  return NextResponse.json({
    districts,
    landWar: {
      isOpen: window.isOpen,
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      nextStart: window.nextStart ? window.nextStart.toISOString() : null,
      standings: warStandings,
    },
  });
}
