import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Workout } from "@/models/Workout";
import { Post } from "@/models/Post";
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
  subscription_id?: number;
};

export async function POST(req: NextRequest) {
  const event: StravaWebhookEvent = await req.json();

  // Strava doesn't sign webhook payloads, so this endpoint is otherwise open to forged events
  // (used to force-publish a run or burn our Strava API quota). When STRAVA_WEBHOOK_SUBSCRIPTION_ID
  // is configured, drop any event whose subscription_id doesn't match ours — a cheap filter that
  // stops blind forgeries. (Data injection is already impossible: we always re-fetch from Strava
  // with the owner's token, so we can only ever ingest that athlete's real activities.)
  const expectedSub = process.env.STRAVA_WEBHOOK_SUBSCRIPTION_ID;
  if (expectedSub && String(event.subscription_id ?? "") !== String(expectedSub)) {
    return NextResponse.json({ ok: true }); // ack (don't reveal the mismatch) but do nothing
  }

  // Strava expects a fast 200 and retries/eventually disables the subscription if it doesn't
  // get one, so ack immediately and do the real work via `after()` (extends the serverless
  // invocation instead of racing the response).
  if (event.object_type === "activity" && event.aspect_type === "create") {
    after(() => processActivityCreated(event).catch((err) => console.error("[strava/webhook] ingest failed:", err)));
  } else if (event.object_type === "activity" && event.aspect_type === "delete") {
    // The athlete deleted the activity on Strava — hide its ICHOR post so it stops showing in the
    // feed. (Gamification side effects — points/territory — aren't unwound here; that needs real
    // reversal logic and is tracked as a separate follow-up.)
    after(() => processActivityDeleted(event).catch((err) => console.error("[strava/webhook] delete failed:", err)));
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

async function processActivityDeleted(event: StravaWebhookEvent) {
  await connectDB();
  const me = await User.findOne({ stravaAthleteId: String(event.owner_id) }).select("_id").lean();
  if (!me) return;
  const workout = await Workout.findOne({
    userId: (me as { _id: unknown })._id,
    externalId: `strava:${event.object_id}`,
  })
    .select("_id")
    .lean();
  if (!workout) return;
  await Post.updateOne({ workoutId: (workout as { _id: unknown })._id }, { $set: { isHidden: true } });
}
