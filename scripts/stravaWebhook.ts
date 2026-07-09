/**
 * One-time Strava push-subscription management. Strava needs a *publicly reachable* URL to
 * call for the verification handshake, so this can't run against localhost — run it after
 * deploying, pointing PUBLIC_URL at the real domain.
 *
 * Usage:
 *   PUBLIC_URL=https://ichor.app npx tsx --env-file=.env scripts/stravaWebhook.ts create
 *   npx tsx --env-file=.env scripts/stravaWebhook.ts list
 *   npx tsx --env-file=.env scripts/stravaWebhook.ts delete <subscription_id>
 */
const API = "https://www.strava.com/api/v3/push_subscriptions";

async function create() {
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) throw new Error("Set PUBLIC_URL to your deployed domain, e.g. PUBLIC_URL=https://ichor.app");

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url: `${publicUrl.replace(/\/$/, "")}/api/integrations/strava/webhook`,
      verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Subscription create failed: ${res.status} ${JSON.stringify(body)}`);
  console.log("Subscription created:", body);
}

async function list() {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
  });
  const res = await fetch(`${API}?${params}`);
  console.log(await res.json());
}

async function del(id: string) {
  if (!id) throw new Error("Usage: stravaWebhook.ts delete <subscription_id>");
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID ?? "",
    client_secret: process.env.STRAVA_CLIENT_SECRET ?? "",
  });
  const res = await fetch(`${API}/${id}?${params}`, { method: "DELETE" });
  console.log(res.status === 204 ? "Deleted." : await res.json());
}

const [, , command, arg] = process.argv;
const run = { create, list, delete: () => del(arg) }[command as "create" | "list" | "delete"];
if (!run) {
  console.error("Usage: stravaWebhook.ts <create|list|delete> [subscription_id]");
  process.exit(1);
}
run();
