import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateCurrentUser } from "@/lib/currentUser";
import { User } from "@/models/User";

/**
 * Flips Beginner-Friendly Mode on or off — reachable any time from Profile (or the /start
 * opt-in screen, or the graduation prompt), not just at onboarding.
 *
 * beginnerModeStartedAt is only set on the false→true transition and left untouched on a
 * later re-enable, so turning the mode off and back on resumes the program instead of
 * restarting the 8-week clock (see lib/beginnerProgram.ts).
 */
export async function PATCH(req: NextRequest) {
  await connectDB();
  const me = await getOrCreateCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { beginnerMode } = await req.json();
  if (typeof beginnerMode !== "boolean") {
    return NextResponse.json({ error: "beginnerMode (boolean) is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { beginnerMode };
  if (beginnerMode && !me.beginnerModeStartedAt) {
    updates.beginnerModeStartedAt = new Date();
  }

  await User.updateOne({ _id: me._id }, { $set: updates });
  return NextResponse.json({ success: true, beginnerMode });
}
