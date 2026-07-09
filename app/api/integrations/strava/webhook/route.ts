import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { ensureFreshStravaToken, fetchStravaActivity, ingestStravaActivity } from "@/lib/strava";

/** One-time subscription handshake — Strava GETs this with a challenge to confirm we own the endpoint. */
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

type StravaWebhookEvent = {
  object_type: "activity" | "athlete";
  aspect_type: "create" | "update" | "delete";
  object_id: number;
  owner_id: number;
};

export async function POST(req: NextRequest) {
  const event: StravaWebhookEvent = await req.json();

  // Strava expects a fast 200 and retries/eventually disables the subscription if it doesn't
  // get one, so ack immediately and do the real work via `after()` (extends the serverless
  // invocation instead of racing the response). Only "create" is handled — an "update" would
  // need to diff and reconcile the already-applied totals/streak, which isn't built yet.
  if (event.object_type === "activity" && event.aspect_type === "create") {
    after(() => processActivityCreated(event).catch((err) => console.error("[strava/webhook] ingest failed:", err)));
  }

  return NextResponse.json({ ok: true });
}

async function processActivityCreated(event: StravaWebhookEvent) {
  await connectDB();
  const me = await User.findOne({ stravaAthleteId: String(event.owner_id) });
  if (!me) return;

  const accessToken = await ensureFreshStravaToken(me);
  const activity = await fetchStravaActivity(accessToken, event.object_id);
  await ingestStravaActivity(me, activity, accessToken);
}
