# ICHOR — Prompt v3: Strava-Driven Territory Fame + Clan Territories

> **This supersedes `prompts.md` for architecture.** That file describes a monorepo
> Next.js+Express+Clerk stack that was never built. The real, live app is a single
> Next.js 16 App Router project, hand-rolled Google OAuth (signed JWT session cookie,
> no Clerk), deployed to **both** Vercel (serverless) and Railway (persistent Node)
> from the same repo, MongoDB Atlas, Upstash Redis, Gemini, Cloudinary, LocationIQ,
> and — as of this prompt — a working Strava OAuth + webhook integration. Read this
> file top to bottom before writing code. Do not reintroduce Clerk, Express, or a
> monorepo split; adapt everything below onto the existing single-app architecture.

---

## 0. What already exists — do not rebuild these

Confirmed in the current codebase. Read the file before touching it.

| Capability | File(s) | Status |
|---|---|---|
| Strava OAuth token exchange + refresh | `lib/strava.ts` | done |
| Strava webhook (activity `create` events) | `app/api/integrations/strava/webhook/route.ts` | done |
| Strava activity → `Workout` + private `Post` ingestion | `lib/strava.ts` (`ingestStravaActivity`) | done, **but see Phase 2 — it bypasses territory + group-run logic entirely right now** |
| Strava route → static map image | `lib/stravaRouteMap.ts` | done |
| Manual zone tagging on post creation | `app/api/posts/route.ts` | done |
| Attack / Exploit / Ignore invasion overlay (manual posts only) | `components/features/PostComposer.tsx`, `lib/territory.ts` (`getZoneContest`, `claimOrContestZone`) | done |
| Attack resolution (Defend / War / Forfeit) | `app/api/attacks/[id]/respond/route.ts`, `lib/territory.ts` (`resolveAttack`, `resolveWar`) | done |
| War → GroupRun creation, join, 30-min capture window, leaderboard | `lib/groupRun.ts`, `app/api/group-runs/[id]/*`, `app/(app)/group-run/[id]/page.tsx` | done |
| Group run auto-links a **manually posted** workout inside the window | `app/api/posts/route.ts` (`findActiveGroupRunForUser`) | done, **Strava path doesn't call this either — same gap as above** |
| Cron endpoint to close expired group-run windows | `app/api/cron/close-group-runs/route.ts` | exists, **not wired to any scheduler yet** |
| Zone lookup by coordinate (nearest centroid, 500m) | `app/api/location/detect/route.ts` | done — used by the manual "detect my location" button only |
| `Territory` model | `models/Territory.ts` | done — `ownerId`, `weeklyCalorieScore`, no fame field yet |
| `CampusZone` model | `models/CampusZone.ts` | done — fixed, seeded polygons only, no user/clan-created zones |
| Clan / ClanMember models | `models/Clan.ts` | done — no clan-owned custom territory concept yet |

The gap this prompt closes: **Strava is the primary data source now, but the entire
invasion/fame/clan-territory system was built assuming a human is present at post time
to answer "Attack, Exploit, or Ignore?" A webhook has no human present.** Everything
below is designed around that constraint.

---

## Phase 1 — Persist route geometry + detect which zone a run actually entered

**Problem:** `Workout` has no lat/lng or route data at all. `ingestStravaActivity` decodes
the polyline only transiently, to build a map image, then throws it away. There's no way
to know which `CampusZone` a Strava run passed through.

**1a. Extend `models/Workout.ts`:**
```ts
route: {
  type: { type: String, enum: ["LineString"], default: undefined },
  coordinates: { type: [[Number]], default: undefined }, // [lng, lat][], sparse — only set for GPS-sourced runs
},
```
Add a sparse `2dsphere` index: `WorkoutSchema.index({ route: "2dsphere" }, { sparse: true });`
Only Strava-sourced workouts will ever populate this — manual/OCR workouts have no GPS trace,
leave `route` unset for those, not an empty array (empty `coordinates` breaks the geo index).

**1b. Export the polyline decoder.** `decodePolyline` in `lib/stravaRouteMap.ts` is currently
private — export it, or lift it into a small shared `lib/polyline.ts` if you'd rather not couple
`stravaRouteMap.ts` (a map-image concern) to territory detection (a geo-query concern). Prefer
the latter — cleaner separation.

**1c. New `lib/zoneDetection.ts`:**
```ts
export async function detectZoneForRoute(coordinates: [number, number][]): Promise<{ zoneId: string; hitFraction: number } | null>
```
Sample ~50 evenly-spaced points along the decoded route (reuse the existing `simplifyPoints`
logic in `stravaRouteMap.ts`, or share it). For each sampled point, query
`CampusZone.findOne({ polygon: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lng, lat] } } } })`.
Tally hits per zone. Return the zone with the most hits **only if it clears a minimum
threshold** (e.g. `hitFraction >= 0.15` — at least 15% of the sampled route was inside that
zone) so a route that merely clips a corner of a zone doesn't count as "entering" it. Return
`null` if no zone clears the threshold (most runs, most of the time — that's fine).

**1d. Wire into `ingestStravaActivity` (`lib/strava.ts`):** after decoding
`activity.map.summary_polyline`, store the coordinates on the `Workout` and call
`detectZoneForRoute`. Pass the result forward — this feeds Phase 2.

---

## Phase 2 — Async invasion decisions (the "no human at post time" problem)

Manual posts get a blocking overlay before submission. A Strava webhook fires seconds after
a real-world run finishes, with nobody looking at a screen. Do **not** try to force a
synchronous decision here — build an inbox instead.

**2a. Extend `Post.contestStatus` enum** (`models/Post.ts`) with one new value:
`"PENDING_DECISION"`. This is the state a Strava-ingested post sits in when
`detectZoneForRoute` found an enemy-owned zone and nobody has chosen Attack/Exploit/Ignore
yet. Note this is distinct from the existing "ATTACKED"/"EXPLOITED" states — those already
mean "the choice is resolved and applied."

**2b. `ingestStravaActivity` territory branch:** after creating the `Workout`, if
`detectZoneForRoute` returned a zone, call the existing `getZoneContest(zoneId, userId)`
(`lib/territory.ts`) exactly like `app/api/posts/route.ts` already does:
- Not contested (unclaimed or user's own zone) → call `claimZone` immediately, same as
  today, no decision needed.
- Contested (someone else owns it) → create the `Post` with `contestStatus: "PENDING_DECISION"`,
  `locationZoneId` set, and **do not** call `claimOrContestZone` yet.

**2c. New routes:**
- `GET /api/territory-events` — returns the current user's posts with
  `contestStatus: "PENDING_DECISION"`, populated with zone name + owner (reuse the shape
  `getZoneContest` already returns).
- `POST /api/territory-events/[postId]/resolve` — body `{ choice: "ATTACK" | "EXPLOIT" | "IGNORE" }`.
  Loads the post's `workoutId` and `locationZoneId`, then does exactly what
  `app/api/posts/route.ts` already does for the synchronous case: `IGNORE` clears
  `locationZoneId` and sets `contestStatus: "NONE"`; `ATTACK`/`EXPLOIT` call
  `claimOrContestZone` and update the post the same way. **Extract the shared logic** — right
  now that branching lives inline in `app/api/posts/route.ts`; pull it into a
  `resolveContestChoice()` helper in `lib/territory.ts` so both the synchronous (manual post)
  and asynchronous (this new route) callers share one implementation instead of drifting.

**2d. Default for abandoned decisions.** If a user never opens the inbox, the post sits in
`PENDING_DECISION` forever, which pollutes scoring (see `lib/scoring.ts` —
`scoreMultiplier`/`battleBonusPoints` default to 1/0, so an unresolved post silently scores as
a full, uncontested win, which is wrong). Add a cutoff: after 24h, auto-resolve as `EXPLOIT`
(half score, no attack spawned on someone's behalf without consent — attacking should always
be an opt-in, explicit choice). Fold this into the same cron sweep as
`closeExpiredGroupRuns()` (`lib/groupRun.ts`) — add `resolveAbandonedTerritoryEvents()`
alongside it and call both from `app/api/cron/close-group-runs/route.ts` (rename that route to
`app/api/cron/sweep/route.ts` since it's no longer just group runs).

**2e. UI — Territory Events inbox.** Add a bell/badge somewhere in the main nav (check
`app/(app)/layout.tsx` or wherever the top nav lives) showing the pending-decision count via
`GET /api/territory-events`. Clicking it opens a sheet reusing the exact visual language of
the existing invasion overlay in `PostComposer.tsx` (owner avatar, "⚔️ You entered X's
territory", Attack/Exploit/Ignore buttons) but as a list of cards instead of a single blocking
modal, since multiple Strava runs could each independently trigger a pending decision.

---

## Phase 3 — Fix the Strava ingestion / group-run divergence

`ingestStravaActivity` currently never calls `findActiveGroupRunForUser` /
`attachRunToGroupRun` (`lib/groupRun.ts`), so a Strava-sourced run posted during someone's War
capture window is silently ignored by the war. Add the same check
`app/api/posts/route.ts` already does, using `activity.start_date` as the workout date, right
after the `Workout` is created in `ingestStravaActivity`. Set `groupRunId` on the ingested
`Post` the same way.

---

## Phase 4 — Territory Fame

**4a. Extend `models/Territory.ts`:**
```ts
fameScore: { type: Number, default: 0 },
distinctRunnerIds: [{ type: Schema.Types.ObjectId, ref: "User" }], // dedup set of everyone who has ever posted into this zone
totalVisits: { type: Number, default: 0 }, // every post tagged here, including repeats
```
`fameScore` is a simple, transparent formula — don't overthink this: `distinctRunnerIds.length * 10 + totalVisits`.
Runners matter more than repeat visits from the same person (that's what makes a zone feel
"popular" rather than just "one person's regular loop").

**4b. Wire into `claimZone` and `claimOrContestZone` (`lib/territory.ts`):** every time either
function touches a `Territory` document (claim, score update, attack, exploit), also
`$addToSet` the poster's `userId` into `distinctRunnerIds` and `$inc totalVisits` — one extra
`updateOne` alongside the existing save, not a separate pass.

**4c. Territory leaderboard route:** `GET /api/territory/fame` — `Territory.find({}).sort({
fameScore: -1 }).limit(20).populate("zoneId").populate("ownerId")`. Return zone name, owner,
fame score, distinct runner count.

**4d. UI:** new tab or section on the existing Territory map page (`app/(app)/map/page.tsx` /
`components/features/TerritoryMap.tsx`) — "Most Famous Territories" list, reusing the
`Avatar` + card patterns already used for the clan leaderboard (`app/(app)/clans/[id]/page.tsx`)
and `app/(app)/leaderboard/page.tsx`.

---

## Phase 5 — Clan-created custom territories

Right now `CampusZone` is a fixed, seeded set of polygons. Clans need to be able to draw and
save their own route/area as a new zone.

**5a. Extend `models/CampusZone.ts`:**
```ts
createdByClanId: { type: Schema.Types.ObjectId, ref: "Clan", default: null }, // null = seeded/official zone
isCustom: { type: Boolean, default: false },
```

**5b. New route `POST /api/zones/custom`:** body is a drawn polygon (array of `[lat, lng]`
points from the Leaflet UI) plus a name. Server-side: compute the centroid, compute `gridX`/
`gridY`/`gridW`/`gridH` for the lightweight SVG fallback map (see how the seed script derives
these today), validate the polygon isn't self-intersecting or absurdly large (cap at, say, 2km²
— reuse a simple shoelace-formula area check), and require the requester to be the clan's
`LEADER` (check `ClanMember` the same way `app/api/clans/*` routes already do). Create the
`CampusZone` with `createdByClanId` set, then immediately `Territory.create({ zoneId, ownerId:
null, clanId })` so it enters fame tracking from zone zero.

**5c. UI:** on the clan detail page (`app/(app)/clans/[id]/page.tsx`), leader-only "Draw your
territory" button opening the Leaflet map in a polygon-draw mode (check if `LeafletZoneMap.tsx`
already has the drawing library wired — `react-leaflet-draw` or manual click-to-add-point
handling is fine for MVP; don't pull in a heavier drawing library than necessary).

**5d. Fold custom zones into existing queries.** `app/api/zones/route.ts` and the territory
fame leaderboard should return custom zones exactly like seeded ones — no special-casing
needed downstream since `isCustom`/`createdByClanId` are just extra fields on the same
`CampusZone` shape. Double check `app/api/location/detect/route.ts` and the new
`detectZoneForRoute` (Phase 1c) naturally pick up custom zones too, since they query
`CampusZone` generically — they will, as long as custom zones get a real `polygon`.

---

## Phase 6 — Clan territory leaderboard

**6a. Route `GET /api/clans/territory-leaderboard`:** aggregate `Territory` by `clanId`
(both zones owned via a member's individual `ownerId` rolling up to their clan, **and**
clan-created custom zones from Phase 5) — sum `fameScore` and count zones held per clan, sort
descending. Reuse `computeAllScoresForRange`-style batching (`lib/scoring.ts`) as a model for
avoiding N+1 queries: one `Territory.find()`, one `Clan.find()`, join in memory.

**6b. UI:** new tab on `app/(app)/leaderboard/page.tsx` — "Clan Territories" alongside whatever
leaderboard views already exist there (check the file for the current tab structure before
adding).

---

## Explicitly deferred — do not build yet

- **Cron scheduling wiring** (`vercel.json` `crons` array + a Railway `node-cron` process
  gated by an env check so it doesn't double-fire against the same Vercel-triggered sweep).
  The sweep endpoint(s) exist and work when called manually; actually scheduling them touches
  deployment config on two live platforms and needs explicit sign-off first.
- Live-tracking during a War group run (real-time position sharing). The current design is
  intentionally "post your run within the window, we compare after the fact" — no websockets,
  no live map. Don't add live tracking unless asked.
- Retroactively backfilling `route`/zone-detection onto Strava activities ingested *before*
  this prompt. Phase 1 only applies going forward from webhook `create` events.

---

## Suggested build order

1. Phase 1 (route storage + zone detection) — foundational, nothing else works without it.
2. Phase 3 (fix the group-run gap) — small, isolated, no new UI.
3. Phase 2 (async decision inbox) — the biggest UI lift; needs Phase 1 to have anything to show.
4. Phase 4 (fame) — small model/route addition, layers on top of Phase 1–2 territory writes.
5. Phase 5 + 6 (clan territories + leaderboard) — largest net-new surface area, do last so it's
   built against a stable fame/detection system rather than in parallel with it.

Run `npx tsc --noEmit` and `npm run lint` after each phase, not just at the end — this is a
big enough change that catching a broken assumption early (e.g. a field name mismatch between
Phase 1's `Workout.route` and Phase 4's fame writes) matters more than usual.
