# ICHOR — Complete Product Requirements Document
## "Turn Sweat Into Lore"

> **Version:** 2.0 — Final Architecture
> **Frontend:** Next.js 14 (App Router) — Vercel
> **Backend:** Node.js + Express — Railway
> **Database:** MongoDB (Atlas Free Tier M0)
> **Auth:** Clerk
> **AI:** Google Gemini 1.5 Flash
> **Target Load:** 500–700 concurrent users
> **Cost:** $0

---

## PART 1: PRODUCT VISION

ICHOR is a campus-exclusive social fitness battleground. Every run you complete becomes territory. Every territory can be challenged. Every challenge can become a war.

You do not track runs inside ICHOR. You import them — from Apple Health, Google Fit, Strava, RunKeeper, or any fitness app screenshot. Once imported, you post them to the feed. Once posted, your run claims territory, earns points, and places you on leaderboards.

**The core loop:**
**Run (externally) → Import data → Tag location → Post → Claim territory → Battle → Dominate leaderboard**

---

## PART 2: TECH STACK (ZERO COST)

### Why This Stack Costs Nothing

| Service | Free Tier |
|---|---|
| Vercel | Unlimited hobby deploys, 100GB bandwidth/month |
| Railway | $5 free credit/month — enough for backend + Redis |
| MongoDB Atlas M0 | 512MB free forever, 500 concurrent connections |
| Clerk | 10,000 MAU free |
| Google Gemini API | 15 RPM free (Gemini 1.5 Flash) |
| Cloudinary | 25GB storage + 25GB bandwidth free |
| Firebase FCM | Free unlimited push notifications |
| Google Maps JS API | $200 free credit/month (more than enough) |
| Upstash Redis | 10,000 commands/day free |

### Full Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript | Web app hosted on Vercel |
| Styling | Tailwind CSS + shadcn/ui | Free, fast, beautiful |
| State | Zustand + TanStack Query v5 | Client + server state |
| Auth | Clerk | Login, sessions, webhooks |
| Backend | Node.js + Express | REST API + WebSockets |
| Real-time | Socket.io | Live leaderboards, notifications |
| Database | MongoDB Atlas + Mongoose | All data (free M0 tier) |
| Cache | Upstash Redis (REST API) | Leaderboards, sessions, rate limiting |
| AI | Google Gemini 1.5 Flash | OCR, coach, diet analysis |
| Media | Cloudinary | Photos, screenshots |
| Push | Firebase Admin FCM | Browser push notifications |
| Maps | Google Maps JS API | Territory display, location pick |
| Jobs | node-cron (in-process) | Replaces BullMQ — free, no Redis queue needed |
| Hosting FE | Vercel | Free forever |
| Hosting BE | Railway | Free $5 credit |

### SOLID Principles Applied

**S — Single Responsibility:** Each Express router handles one domain only (auth, workouts, posts, territories, leaderboards, clans, coach). Each Mongoose model is in its own file.

**O — Open/Closed:** Score calculation uses a strategy pattern — new scoring rules added without touching existing logic. New leaderboard categories added via config, not code changes.

**L — Liskov Substitution:** Location providers (GPS, map pick, manual) implement a single `LocationProvider` interface. Swapping providers does not break anything.

**I — Interface Segregation:** Health sync (Apple/Google), OCR, and manual entry are three separate import interfaces. Frontend consumes only what it needs.

**D — Dependency Inversion:** Backend services depend on abstractions (repository interfaces), not direct Mongoose calls. Swap MongoDB for anything else without touching business logic.

### Scalability for 500–700 Concurrent Users

- MongoDB Atlas M0 handles 500 simultaneous connections — exactly enough. Connection pooling via Mongoose (pool size 10).
- Upstash Redis for leaderboard sorted sets — handles thousands of reads/sec on free tier.
- Next.js on Vercel: edge-cached static pages, ISR for leaderboards (revalidate every 60s).
- Express backend: stateless — Railway can run 2 instances if needed (still free).
- Socket.io: rooms scoped per territory/clan — not broadcasting to all 700 users at once.
- Rate limiting: express-rate-limit on all API routes (100 req/min per user).
- Image optimization: all uploads go directly to Cloudinary from browser (signed upload) — backend never handles binary data.

---

## PART 3: ARCHITECTURE — WHAT GOES WHERE

```
Browser (Next.js on Vercel)
  ↕ HTTPS REST + WebSocket
Express API (Railway)
  ↕ Mongoose         ↕ ioredis (Upstash)    ↕ Gemini SDK
MongoDB Atlas     Upstash Redis           Google AI
  ↕ Cloudinary SDK (server-side signing only)
  ↕ Firebase Admin (push)
  ↕ Google Maps (frontend SDK)
```

### Request Flow Example — Posting a Workout

1. User finishes run, opens ICHOR on browser
2. Clicks "Import" → device GPS pings once (Geolocation API) → gets lat/lng
3. If GPS fails → Google Maps embed loads → user taps their location
4. User uploads Strava screenshot → browser sends to `POST /api/workouts/ocr`
5. Backend uploads to Cloudinary, sends URL to Gemini Vision → gets structured JSON
6. User sees pre-filled form (correctable) → adds caption, photos, diet card
7. Clicks "Post" → `POST /api/posts` saves to MongoDB
8. Background: node-cron territory claim job runs → updates territory in MongoDB
9. Socket.io emits `feed:new_post` to all connected clients in same college room
10. Leaderboard sorted set in Upstash Redis updated with new score

---

## PART 4: FULL FEATURE SPECIFICATION

### 4.1 — Workout Import Engine

**Method A — Apple Health / Google Fit Sync (Primary for mobile browsers)**

Using the Health API web bridge:
- On import page load: check if browser supports `navigator.health` (Chrome on Android with Health Connect) or prompt iOS users to use the Share Workout feature from Apple Health to ICHOR's share target (PWA share target).
- Fallback: user exports workout as `.fit` or `.gpx` file from their wearable app → ICHOR parses it server-side.
- Google Fit REST API: user connects Google account once via OAuth → ICHOR backend fetches last 7 days of activities via `fitness.googleapis.com`.
- Apple Health: iOS users use the "Export Health Data" feature and upload the XML, or use the Strava/Garmin screenshot method.

**Method B — Screenshot OCR (Primary for most users)**

User takes a screenshot from any fitness app (Strava, RunKeeper, Garmin, Nike Run Club, Samsung Health, Apple Fitness) and uploads it on the import page.
- File input (drag & drop + click) accepts PNG, JPG, HEIC.
- Browser sends to `POST /api/workouts/ocr`.
- Backend: upload to Cloudinary → send URL to Gemini 1.5 Flash Vision.
- Gemini extracts: activityType, distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned, heartRateAvg, workoutDate.
- Pre-filled editable form shown. Screenshot stored as verification artifact.
- 3 community flags → activity hidden pending admin review.

**Method C — Google Fit OAuth Sync**

- User clicks "Connect Google Fit" → OAuth2 flow → backend stores refresh token in MongoDB.
- On demand sync: `POST /api/workouts/sync/googlefit` → fetches last 7 days from Fitness API.
- Deduplication by `startTimeMillis` stored as `externalId`.

**Live Group Run Sync (60-second Health Sync):**

During a declared group run session:
- Each participant's browser polls their connected Google Fit account every 60 seconds.
- `GET /api/groupruns/:id/sync` → backend fetches latest activity data from Fit API for this user → pushes update to Socket.io room.
- If Google Fit unavailable → fallback: user submits checkpoint splits manually via a simple form every km.
- Live leaderboard updates in real time via Socket.io as data comes in.
- Session ends when host closes it or all participants submit final stats.

**Location Tagging (one-time ping, not tracking):**

When user clicks "Post Workout":
1. Browser calls `navigator.geolocation.getCurrentPosition()` — one ping, instant, no tracking.
2. On success: lat/lng sent with the post. Backend reverse-geocodes to district/city using Google Maps Geocoding API. Territory polygon looked up via geospatial query in MongoDB.
3. On failure (network error, denied): Show message "Location unavailable — pick your run area on the map." Google Maps JS embed loads. User taps the map to drop a pin. Coordinates sent with post.
4. Both paths produce identical `{ lat, lng, district, city, territory }` object — system doesn't care which method was used.

---

### 4.2 — Territory System

**How territories work:**

The world is divided into named territories. A territory is not an app-defined polygon — it is a real geographic area (a park, a road, a neighbourhood) that users name themselves.

**Creating a territory:**
- When a user posts a workout and tags a location for the first time, if no territory exists at those coordinates within 500m, they are prompted: "You're the first to run here. Name this territory."
- They give it a name (e.g. "Lodhi Garden Loop", "IIT Delhi Track").
- A territory record is created in MongoDB with: name, creator, centroid coordinates, radius 500m.
- The creator becomes the first owner.

**Territory ownership and leaderboard:**
- Each territory has its own internal leaderboard: all runners who have posted workouts tagged to that territory, ranked by their weekly score on that territory.
- The #1 ranked runner on the territory leaderboard is the territory owner.
- Territory owner is updated automatically every Monday when weekly scores reset.
- Score for a specific territory = calories burned × pace bonus on runs tagged to that territory this week.

**Challenges:**
- Any runner who posts a workout in a territory and is not #1 can "Challenge" the owner.
- Challenge options:
  - **Stat Battle:** both runners' cumulative weekly stats on that territory compared at end of week. Better stats win.
  - **Sprint Duel:** schedule a group run session. Both submit results. Better stats take the territory.
- Owner gets a notification: "[Name] is challenging your territory [Territory Name]."
- Owner can accept or decline. Declining forfeits territory automatically.

**Clan territories:**
- If the top 3 runners on a territory leaderboard are from the same clan → territory becomes a clan territory.
- Clan territory shows clan color on the map.

---

### 4.3 — Local Leaderboards

**District / City leaderboards:**

- When a workout is posted, backend reverse-geocodes the location to extract: `district` (e.g. "South Delhi"), `city` (e.g. "New Delhi"), `state` (e.g. "Delhi").
- These are stored on the post.
- District leaderboard = all users whose posts are tagged in that district this week, ranked by weekly score.
- City leaderboard = same logic at city level.

**"Sync Local" button:**
- On the leaderboard page, user clicks "Find My Area."
- Browser pings `navigator.geolocation` once.
- Backend returns the district and city leaderboard for those coordinates.
- Shows who else is running in their local area — even if those people are not in their college club.
- This is the discovery mechanism for finding rivals in real life.

**Leaderboard categories:**

1. **Global ICHOR** — all users, all time, by total career score
2. **Weekly Overall** — all users this week by weekly score
3. **My District** — this week, your district only
4. **My City** — this week, your city only
5. **My Territory** — leaderboard for each territory you've run in
6. **Calorie King** — most calories burned this week
7. **Pace God** — best average pace (min 3 runs this week)
8. **Distance Destroyer** — most total km this week
9. **Grind Streak** — most consecutive days with a post
10. **Integrity Champion** — most Integrity Points (diet honesty, all-time)
11. **Clan Wars** — clans ranked by combined score + territories held

---

### 4.4 — Scoring System

**Weekly Score Formula:**

```
baseCalories = SUM of caloriesBurned from posts this week

consistencyMultiplier = MIN(1.0 + (activeDays - 1) × 0.1, 2.0)
(activeDays = days with at least one post this week)

paceBonus = IF avgPace < 5 min/km → 1.3×
            IF avgPace 5–6 min/km → 1.15×
            IF avgPace 6–7 min/km → 1.0×
            IF avgPace > 7 min/km → 0.9×

integrityBonus = cleanDietLogs × 50

cheatPenalty = cheatDietLogs × (baseCalories × 0.10)

weeklyScore = (baseCalories × consistencyMultiplier × paceBonus) + integrityBonus - cheatPenalty
```

**Territory Score (per territory per week):**
```
territoryScore = SUM of (caloriesBurned × paceBonus) for all posts tagged to this territory this week
```

**Career Score:**
```
careerScore = SUM of all weeklyScores ever + territoryBonus (50 per week held) + battleBonus (200 per battle won)
```

---

### 4.5 — Diet Honesty Card

After posting a workout, user is shown: **"What did you fuel with today?"**

- Free text input: "Had pasta for lunch, protein shake after run, pizza for dinner"
- Gemini analyzes it → returns: classification (CLEAN / CHEAT / NEUTRAL), estimatedCaloriesIn, integrityBonus, tip
- Shown on the activity card publicly:
  - CLEAN: green "Fuelled Right" badge + +50 integrity points
  - CHEAT: red "Cheat Day 🍕" badge, small calorie penalty shown
  - NEUTRAL: gray "Mixed Fuel" badge, +25 integrity points
- **Calorie balance shown:** Calories Burned vs Calories In → net deficit or surplus displayed on the card
- Other users can react to the diet card with emoji reactions

---

### 4.6 — Social Feed

**Feed:**
- Chronological with filter tabs: All | Following | Clan | My Territory | Top Today
- Infinite scroll via cursor-based pagination

**Activity Card:**
- Header: avatar, name, time ago, activity badge (Run/Walk/Cycle), verification badge (Fit Sync = ✓, OCR = 📷)
- Hero photo
- Stats strip: Distance | Pace | Duration | Calories Burned
- Diet Honesty Card (if attached): calories in vs out balance bar
- Territory tag chip: "📍 Lodhi Garden Loop — 3rd on territory leaderboard"
- Caption (expandable)
- Screenshot proof thumbnail (if OCR)
- Footer: Flame rating (1–5), Comments count, Share

**Comments:**
- Threaded replies (1 level deep)
- Emoji reactions on comments
- @mentions

**Profile:**
- Stats: total km, total workouts, total calories, territories owned, battles won/lost
- Streak calendar (GitHub heatmap style)
- Career score prominently displayed
- Territory map: mini map showing all territories they've ever tagged
- Badges (earned)
- All posts in a grid
- Weekly training plan from Gemini (collapsible card)

---

### 4.7 — Group Runs

**Creating a group run:**
- Title, description, location (map tap or GPS), start time, max participants, type (Competitive / Friendly)
- Share a 6-char session code

**During the run:**
- Each participant has the session open in their browser
- Every 60 seconds: browser attempts Google Fit sync → if connected, latest activity data pulled and posted to `POST /api/groupruns/:id/sync/:userId`
- If Fit unavailable: participant manually taps distance checkpoints (1km, 2km, 3km buttons)
- Socket.io broadcasts updated leaderboard to all participants in real time
- Live leaderboard shows: rank, name, current distance, current pace, calories — updating live

**End of run:**
- Host ends session
- Each participant submits final screenshot/data
- Final leaderboard locked
- COMPETITIVE: winner gains territory claim for the tagged location (if stats beat current owner)
- FRIENDLY: all participants get a co-run badge, no territory transfer

---

### 4.8 — Clans

- Create clan: name, 4-char tag, color, optional weekly diet pact
- Max 15 members (increased from 10 for 200-person college)
- Clan territory = all territories where top 3 runners are clan members
- Clan Wars: challenge another clan → 3v3 stat comparison → winner clan gains 1 territory from loser
- Clan leaderboard: combined weekly score + (territories × 200 bonus)
- Clan chat via Socket.io room
- Clan Diet Pact: weekly challenge (e.g. "no sugar") → completing earns clan integrity bonus

---

## PART 5: MONGODB SCHEMA

### Collections

**users**
```
{
  _id, clerkId (unique), email, name, avatarUrl, bio,
  college, fcmToken,
  stats: {
    totalDistanceKm, totalWorkouts, totalCalories,
    streakDays, longestStreak, integrityPoints,
    battlesWon, battlesLost, careerScore, weeklyScore
  },
  clanId (ref Clan),
  connectedApps: { googleFitRefreshToken, stravaToken },
  badges: [{ name, awardedAt }],
  createdAt
}
```

**workouts**
```
{
  _id, userId (ref User),
  sourceType: 'HEALTH_SYNC' | 'OCR_SCREENSHOT' | 'MANUAL' | 'GOOGLE_FIT',
  activityType: 'RUN' | 'WALK' | 'CYCLE',
  distanceKm, durationSeconds, avgPaceMinPerKm,
  caloriesBurned, heartRateAvg,
  workoutDate, externalId (dedup),
  screenshotUrl, verificationStatus: 'PENDING' | 'VERIFIED' | 'FLAGGED',
  createdAt
}
```

**posts**
```
{
  _id, userId (ref User), workoutId (ref Workout, unique),
  caption, photoUrls: [],
  location: {
    lat, lng, district, city, state,
    territoryId (ref Territory), territoryName,
    method: 'GPS' | 'MAP_PICK'
  },
  isPublic,
  engagement: { avgFlameRating, flameCount, kudosCount, flagCount },
  dietCard: {
    description, classification, estimatedCaloriesIn,
    caloriesBurned (mirror from workout), netBalance,
    integrityBonus, tip
  },
  weeklyScore, territoryScore,
  createdAt
}
```

**territories**
```
{
  _id, name, createdBy (ref User),
  centroid: { type: 'Point', coordinates: [lng, lat] },
  radiusMeters: 500,
  currentOwnerId (ref User), currentClanOwnerId (ref Clan),
  weeklyLeaderboard: [{ userId, score, rank }],
  totalRuns, createdAt
}
```
*Index: `centroid` as 2dsphere for geospatial queries*

**attacks**
```
{
  _id, attackerId, defenderId, territoryId,
  status: 'PENDING' | 'ACCEPTED' | 'FORFEITED' | 'RESOLVED' | 'EXPIRED',
  type: 'STAT' | 'SPRINT',
  scheduledAt, resolvedAt, winnerId,
  createdAt
}
```

**clans**
```
{
  _id, name, tag (unique 4-char), leaderId,
  color, dietPactDescription,
  stats: { weeklyScore, battlesWon, territoriesHeld },
  members: [{ userId, role: 'LEADER'|'MEMBER', joinedAt }],
  createdAt
}
```

**groupruns**
```
{
  _id, title, hostId, sessionCode (6-char unique),
  type: 'COMPETITIVE' | 'FRIENDLY',
  location: { lat, lng, district, city },
  startAt, endedAt,
  status: 'LOBBY' | 'ACTIVE' | 'COMPLETED',
  participants: [{
    userId, status: 'READY'|'RUNNING'|'FINISHED',
    checkpoints: [{ distanceKm, timestamp }],
    finalStats: { distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned }
  }],
  createdAt
}
```

**leaderboard_history**
```
{
  _id, week (YYYY-WW), category, userId, score, rank, createdAt
}
```

---

## PART 6: API ROUTES

### Auth
- `POST /api/webhooks/clerk` — user sync
- `PATCH /api/users/profile`
- `PATCH /api/users/fcm-token`
- `GET /api/users/:id`

### Workouts & Import
- `POST /api/workouts/ocr` — screenshot → Gemini → JSON
- `POST /api/workouts/sync/googlefit` — OAuth sync
- `POST /api/workouts/sync/manual` — manual entry
- `GET /api/workouts/mine` — user's workout history

### Posts & Feed
- `POST /api/posts` — create post (triggers territory claim job)
- `GET /api/feed?cursor=` — paginated feed
- `GET /api/posts/:id`
- `POST /api/posts/:id/flame` — rate 1–5
- `POST /api/posts/:id/kudos`
- `POST /api/posts/:id/flag`
- `POST /api/posts/:id/comments`
- `GET /api/posts/:id/comments`
- `POST /api/coach/diet-analyze` — Gemini diet classification

### Territories
- `GET /api/territories?lat=&lng=&radius=` — nearby territories
- `POST /api/territories` — create new territory
- `GET /api/territories/:id` — territory detail + leaderboard
- `POST /api/attacks` — initiate challenge
- `POST /api/attacks/:id/respond`
- `POST /api/attacks/:id/resolve`

### Leaderboards
- `GET /api/leaderboards/weekly`
- `GET /api/leaderboards/local?lat=&lng=` — district + city boards
- `GET /api/leaderboards/territory/:id`
- `GET /api/leaderboards/clans`
- `GET /api/leaderboards/categories/:name` — calorie/pace/distance/streak/integrity

### Clans
- `POST /api/clans`
- `GET /api/clans/:id`
- `GET /api/clans/search?q=`
- `POST /api/clans/:id/join`
- `POST /api/clans/:id/leave`
- `DELETE /api/clans/:id/members/:userId`
- `PATCH /api/clans/:id`

### Group Runs
- `POST /api/groupruns`
- `GET /api/groupruns/:code` — join by session code
- `POST /api/groupruns/:id/join`
- `POST /api/groupruns/:id/sync/:userId` — submit checkpoint/Fit data
- `POST /api/groupruns/:id/end`

### AI Coach
- `POST /api/coach/chat`
- `POST /api/coach/training-plan`
- `POST /api/coach/diet-analyze`

### Upload
- `POST /api/upload` — Cloudinary signed upload URL

---

## PART 7: ENV VARIABLES

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_ALLOWED_DOMAIN=

# Backend
NEXT_PUBLIC_API_URL=https://ichor-backend.railway.app
PORT=5000

# MongoDB
MONGODB_URI=mongodb+srv://...

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Google
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
GOOGLE_FIT_CLIENT_ID=
GOOGLE_FIT_CLIENT_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=

# Sentry (free)
SENTRY_DSN=

# Admin
ADMIN_SECRET=
```

---

## PART 8: BUILD PHASES

### Phase 1 — Foundation (Week 1–2)
1. Next.js 14 project with TypeScript, Tailwind, shadcn/ui, Zustand, TanStack Query
2. Clerk auth with college domain gating, webhook user sync
3. MongoDB Atlas setup, Mongoose models for all collections
4. Express backend scaffold on Railway, all route stubs, requireAuth middleware
5. 2dsphere index on Territory.centroid, test geospatial query

### Phase 2 — Import Engine (Week 3–4)
1. Screenshot OCR: file upload → Cloudinary → Gemini Vision → editable form
2. Google Fit OAuth flow and workout sync
3. Geolocation one-ping + Google Maps fallback for location tagging
4. Reverse geocoding (district, city extraction)
5. Territory creation on first post in area
6. Deduplication logic

### Phase 3 — Social Layer (Week 5–6)
1. Post composer: photos, caption, diet card, location tag
2. Diet analyzer (Gemini) integrated in post composer
3. Activity feed with infinite scroll
4. Flame rating, kudos, comments, flags
5. Profile page with stats, heatmap, badges, post grid
6. Real-time feed updates via Socket.io

### Phase 4 — Territory + Leaderboards (Week 7–9)
1. Territory map (Google Maps JS) with markers and ownership display
2. Territory leaderboard per zone
3. Attack/challenge flow
4. All 11 leaderboard categories
5. Upstash Redis sorted sets for weekly leaderboards
6. Local leaderboard (geolocation sync button)
7. node-cron jobs (weekly reset, streak check, challenge expiry)

### Phase 5 — Group Runs + Clans (Week 10–11)
1. Group run session creation, lobby, session code join
2. Google Fit live sync every 60s during session
3. Manual checkpoint fallback
4. Socket.io live leaderboard during group run
5. Clan system (create, join, wars, chat)
6. Clan territory logic

### Phase 6 — AI + Polish (Week 12)
1. Gemini AI coach "Dhruv" chat
2. Weekly training plan generation
3. Push notifications (FCM browser push)
4. Error boundaries, loading skeletons, offline detection
5. Sentry integration
6. Admin dashboard (flagged posts, zone management)

---

## PART 9: ANTIGRAVITY MASTER ORCHESTRATOR PROMPT

Paste this into Antigravity FIRST. Attach `ichor.prd.md` to the project before running.

```
You are the Lead Principal Software Engineer behind "ICHOR" — a campus-exclusive social fitness battleground. Your job is to read ichor.prd.md fully, then implement the entire application systematically using Review-driven development.

MANDATORY RULES — NEVER BREAK THESE:
1. Stack is non-negotiable: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui on Vercel. Express + Mongoose + Upstash Redis on Railway. MongoDB Atlas M0. Clerk auth. Gemini 1.5 Flash AI. Zero paid services.
2. NO GPS tracking of any kind. Location is a ONE-TIME ping via Geolocation API at upload time only, with Google Maps tap-to-pick as fallback.
3. NO native mobile app. This is a Next.js web application only.
4. Apply SOLID principles throughout: single-responsibility routers, repository pattern for DB access, strategy pattern for scoring, interface segregation for import methods.
5. Design for 500–700 concurrent users: connection pooling (Mongoose pool:10), Upstash Redis for all leaderboards, rate limiting on all routes, cursor-based pagination everywhere, no N+1 queries (use aggregation pipelines).
6. The Diet Honesty Card is a core feature. Never skip it. It appears on every activity card.
7. Territory is location-based (MongoDB 2dsphere geospatial query, 500m radius), not GPS-path-based.
8. Leaderboards live in Upstash Redis sorted sets. DB is source of truth. Redis is the read cache.
9. Group run live leaderboard: Google Fit sync every 60s → Socket.io broadcast. Fallback: manual checkpoint submit.
10. Use node-cron (not BullMQ) for all scheduled jobs — runs in-process on Railway, zero extra cost.

BRAND & UI RULES:
- Primary color: #AE93F4 (lavender/violet — "Momentum")
- Background: #231F20 (near-black — "Midnight Run")
- Accent: #FDA2DE (pink blush — "After Run")
- Gold accent: #D4AF37 (for leaderboard top 3)
- Display font: Neighbour (bold condensed, all-caps for headings) — load via @font-face
- Body font: Inter (Light 300, Bold 700)
- Visual style: dark backgrounds, lavender glows, motion blur hero images
- Every card has a subtle lavender border glow on hover
- Leaderboard rank 1: gold gradient. Rank 2: silver. Rank 3: bronze.
- All buttons: rounded-full, lavender (#AE93F4) fill, dark text
- Tagline displayed in hero: "Turn Sweat Into Lore"

EXECUTION ORDER:
1. Read ichor.prd.md fully and confirm understanding in 3 bullet points.
2. Ask maximum 2 clarifying questions.
3. Run Prompt 01 → wait for approval → Prompt 02 → and so on.
4. After each prompt: show file tree of what was created, show key code snippets, ask "Ready to proceed to Prompt 0X?"
5. Never proceed without explicit approval.
6. Never add packages not listed in the PRD tech stack.
7. Never implement any feature not in the PRD without asking first.

Read ichor.prd.md now and confirm.
```

---

## PART 10: ALL ANTIGRAVITY PROMPTS (01–11)

---

### PROMPT 01 — Project Scaffold (Next.js + Backend)

```
Scaffold the complete ICHOR application — two separate projects in one monorepo.

MONOREPO STRUCTURE:
ichor/
  apps/
    web/          → Next.js 14 App Router (deployed to Vercel)
    api/          → Express backend (deployed to Railway)
  packages/
    types/        → Shared TypeScript interfaces
    utils/        → Shared score calculator, formatters

Use npm workspaces. No Turborepo (adds complexity). Simple package.json workspaces.

WEB APP (apps/web):
- Next.js 14 App Router, TypeScript strict
- Tailwind CSS with custom theme:
  colors: { primary: '#AE93F4', background: '#231F20', accent: '#FDA2DE', gold: '#D4AF37' }
  fontFamily: { display: ['Neighbour', 'sans-serif'], body: ['Inter', 'sans-serif'] }
- shadcn/ui (init with dark theme, custom primary color)
- Zustand store slices: userSlice, importSlice, feedSlice
- TanStack Query v5 with queryClient (staleTime 30s, retry 2)
- Axios base instance: reads NEXT_PUBLIC_API_URL, auto-attaches Clerk JWT via interceptor

App Router structure:
app/
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  (app)/feed/page.tsx
  (app)/import/page.tsx
  (app)/map/page.tsx
  (app)/leaderboard/page.tsx
  (app)/profile/[userId]/page.tsx
  (app)/territory/[id]/page.tsx
  (app)/clans/page.tsx
  (app)/clans/[id]/page.tsx
  (app)/grouprun/page.tsx
  (app)/grouprun/[id]/page.tsx
  (app)/coach/page.tsx
  layout.tsx → ClerkProvider + QueryClientProvider + ZustandProvider
  globals.css → Tailwind + Neighbour font @font-face

Components to scaffold (empty with correct props interface):
components/ui/ → (shadcn components auto-generated)
components/features/
  ActivityCard.tsx
  FlameRating.tsx
  DietHonestyCard.tsx
  TerritoryMap.tsx
  LeaderboardRow.tsx
  GroupRunLiveBoard.tsx
  StatChip.tsx
  VerificationBadge.tsx

API APP (apps/api):
- Express + TypeScript
- Folder structure applying Single Responsibility:
  src/
    routes/        → auth.ts, workouts.ts, posts.ts, territories.ts, leaderboards.ts, clans.ts, groupruns.ts, coach.ts, upload.ts, admin.ts
    controllers/   → one controller per route file
    services/      → territoryService.ts, scoreService.ts, geminiService.ts, notificationService.ts, locationService.ts
    repositories/  → userRepo.ts, postRepo.ts, territoryRepo.ts, clanRepo.ts (Dependency Inversion)
    models/        → User.ts, Workout.ts, Post.ts, Territory.ts, Attack.ts, Clan.ts, GroupRun.ts, LeaderboardHistory.ts
    middleware/    → requireAuth.ts, rateLimiter.ts, errorHandler.ts
    jobs/          → weeklyReset.ts, dailyStreak.ts, challengeExpiry.ts, streakReminder.ts (node-cron)
    lib/           → mongoose.ts, redis.ts, gemini.ts, cloudinary.ts, firebase.ts
    app.ts         → Express app setup
    server.ts      → listen, cron start

SHARED TYPES (packages/types):
Export interfaces: IUser, IWorkout, IPost, ITerritory, IAttack, IClan, IGroupRun, IDietCard, ILeaderboardEntry, ILocation

SHARED UTILS (packages/utils):
scoreCalculator.ts: calculateWeeklyScore(posts), calculateTerritoryScore(posts), calculateCareerScore(user)
formatters.ts: formatPace(minPerKm), formatDistance(km), formatDuration(seconds), timeAgo(date)

Create .env.example in both apps with all required variables.
Create README.md with setup instructions.

Do not implement any logic yet — scaffold only. Show me the complete file tree when done.
```

---

### PROMPT 02 — Clerk Auth + MongoDB User Sync

```
Implement complete authentication for ICHOR using Clerk and MongoDB.

FRONTEND (apps/web):

Install @clerk/nextjs. Configure in layout.tsx with ClerkProvider.

Login page (app/(auth)/login/page.tsx):
- Full-page dark layout (#231F20 background)
- ICHOR logo in Neighbour font, #AE93F4 color, center
- "Turn Sweat Into Lore" tagline in Inter Light, #FDA2DE
- Email OTP sign-in card with lavender border glow
- Google OAuth button
- Styled with Tailwind using brand colors
- Loading spinner in #AE93F4 on submit

Register page:
- Same design
- After Clerk registration: validate email domain against NEXT_PUBLIC_CLERK_ALLOWED_DOMAIN if set
- On success: POST /api/users/sync to create DB record
- Redirect to /import (onboarding starts with first workout import)

Middleware (middleware.ts):
- Protect all /app/* routes with clerkMiddleware
- Public routes: /, /login, /register, /api/webhooks/clerk

useCurrentUser hook:
- Fetches merged Clerk user + DB user profile
- Caches in Zustand userSlice
- Returns { clerkUser, dbUser, isLoading }

BACKEND (apps/api):

POST /api/webhooks/clerk:
- Verify Svix signature with CLERK_WEBHOOK_SECRET
- On user.created: upsert User in MongoDB (clerkId, email, name, avatarUrl)
- On user.updated: sync name and avatarUrl
- Return 200

requireAuth middleware:
- Use @clerk/express to verify JWT
- Attach req.userId (clerkId) to request
- Return 401 if invalid

POST /api/users/sync:
- Upsert user in MongoDB by clerkId
- Initialize stats object with all zeros
- Return full user document

PATCH /api/users/profile:
- Update name, bio, avatarUrl
- Validate with Zod

PATCH /api/users/fcm-token:
- Save browser push token to user.fcmToken

GET /api/users/:id:
- Return public user profile (no sensitive fields)
- Include: stats, badges, recent posts count, clan info

Rate limiting on all /api/users/* routes: 60 req/min per user via express-rate-limit.
```

---

### PROMPT 03 — MongoDB Models + Indexes

```
Implement all Mongoose models for ICHOR with correct indexes for performance at 500–700 concurrent users.

Create each model in apps/api/src/models/ — one file per model.

USER MODEL (User.ts):
All fields from the schema in Part 5 of the PRD.
Indexes: { clerkId: 1 } unique, { 'stats.weeklyScore': -1 } (leaderboard queries), { clanId: 1 }
Add instance method: calculateWeeklyScore() → recomputes from posts, updates stats.weeklyScore

WORKOUT MODEL (Workout.ts):
Indexes: { userId: 1, workoutDate: -1 }, { externalId: 1, userId: 1 } unique sparse (dedup)

POST MODEL (Post.ts):
Indexes: { userId: 1, createdAt: -1 }, { 'location.territoryId': 1 }, { 'location.district': 1, createdAt: -1 }, { 'location.city': 1, createdAt: -1 }, { createdAt: -1 } (feed)
The dietCard is embedded (not a separate collection — it is always fetched with the post).

TERRITORY MODEL (Territory.ts):
Indexes: { centroid: '2dsphere' } — CRITICAL for geospatial queries
{ currentOwnerId: 1 }, { createdAt: -1 }

ATTACK MODEL (Attack.ts):
Indexes: { defenderId: 1, status: 1 }, { attackerId: 1, status: 1 }, { territoryId: 1 }

CLAN MODEL (Clan.ts):
Indexes: { tag: 1 } unique, { 'stats.weeklyScore': -1 }

GROUPRUN MODEL (GroupRun.ts):
Indexes: { sessionCode: 1 } unique, { hostId: 1 }, { status: 1, startAt: 1 }

LEADERBOARD HISTORY (LeaderboardHistory.ts):
Indexes: { week: 1, category: 1 }, { userId: 1, week: -1 }

MONGOOSE SETUP (lib/mongoose.ts):
- Connect with MONGODB_URI
- Pool size: 10 (maxPoolSize: 10)
- serverSelectionTimeoutMS: 5000
- Log connection status
- Export connectDB()

REDIS SETUP (lib/redis.ts):
- Use @upstash/redis (REST client — works in Node.js, no persistent connection needed)
- Initialize with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
- Export redis client
- Helper functions: getLeaderboard(key, start, end), addToLeaderboard(key, userId, score), clearLeaderboard(key)

SEED FILE (src/seed.ts):
- 10 test users with varied stats
- 5 territories across Delhi (use real coordinates: Lodhi Garden 28.5935,77.2229 / India Gate 28.6129,77.2295 / IIT Delhi 28.5459,77.1927 / Nehru Park 28.5969,77.1987 / Lodi Colony 28.5878,77.2215)
- 15 sample posts across territories
- 3 clans
- Territory ownership assignments

Run connectDB → seed → disconnect. Confirm counts logged.
```

---

### PROMPT 04 — Workout Import Engine + Location System

```
Build the complete workout import system and location tagging for ICHOR.

LOCATION SERVICE (apps/api/src/services/locationService.ts):

reverseGeocode(lat, lng):
- Call Google Maps Geocoding API: https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={GOOGLE_MAPS_API_KEY}
- Extract from results: district (sublocality_level_1), city (locality), state (administrative_area_level_1)
- Return { district, city, state, formattedAddress }

findNearbyTerritory(lat, lng):
- MongoDB geospatial query: Territory.findOne({ centroid: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 500 } } })
- Return territory or null

FRONTEND — Import Page (apps/web/app/(app)/import/page.tsx):

Three-tab layout with dark card styling and lavender tab indicators:

TAB 1 — Screenshot OCR:
- Drag-and-drop zone (dashed lavender border, dark fill)
- "Drop your Strava, RunKeeper, or Garmin screenshot here"
- File input accepts PNG, JPG, HEIC
- On file select: show image preview + loading spinner with "Dhruv is reading your workout..."
- POST /api/workouts/ocr → show editable form with extracted fields
- Fields: Activity Type (dropdown), Distance (km), Duration (h:mm:ss), Avg Pace, Calories, Heart Rate, Date
- User can correct any field
- "Confirm & Continue to Post" button → navigates to post composer with workout data

TAB 2 — Google Fit Sync:
- "Connect Google Fit" button → OAuth flow
- If connected: show last 7 days of activities as cards
- Each card has "Add to ICHOR" button
- On click: POST /api/workouts/sync/googlefit with activityId → dedup check → navigate to post composer

TAB 3 — Manual Entry:
- Simple form for all workout fields
- Useful for treadmill, gym cardio, etc.

LOCATION TAGGING (component: LocationTagger.tsx):

Called within the post composer. Shows a location card.

On mount:
1. Call navigator.geolocation.getCurrentPosition() with 10 second timeout
2. On success: show "📍 Detecting your run location..." → call GET /api/location/detect?lat=&lng=
3. Backend returns { district, city, territory (if exists), method: 'GPS' }
4. Show: green chip "✓ Location detected: [Territory Name or District]"
5. If no territory within 500m: show "🆕 You're the first here! Name this territory." → input field

On failure (or user clicks "Wrong location?"):
1. Show Google Maps JS embed (full width, 300px height, dark theme)
2. "Click on the map to drop a pin where you ran"
3. On map click: get coordinates → reverse geocode → same flow as GPS success

BACKEND ENDPOINTS:

POST /api/workouts/ocr:
1. Receive multipart file
2. Upload to Cloudinary (using cloudinary.uploader.upload stream)
3. Send image URL to Gemini: gemini-1.5-flash with vision
4. System prompt: "Extract workout data from this fitness app screenshot. Return ONLY raw JSON (no markdown): { activityType: 'RUN'|'WALK'|'CYCLE', distanceKm: number, durationSeconds: number, avgPaceMinPerKm: number|null, caloriesBurned: number, heartRateAvg: number|null, workoutDate: 'YYYY-MM-DD' }. Use null for fields not visible."
5. Strip any markdown fences, JSON.parse
6. Save Workout document (verificationStatus: PENDING)
7. Return { workoutId, extracted, screenshotUrl }

GET /api/location/detect?lat=&lng=:
1. reverseGeocode(lat, lng)
2. findNearbyTerritory(lat, lng)
3. Return { district, city, state, territory: { id, name } | null, method: 'GPS' }

POST /api/workouts/sync/googlefit:
1. Fetch user's googleFitRefreshToken from DB
2. Refresh access token via Google OAuth2
3. Fetch sessions from Fitness API for last 7 days
4. For each session: check if externalId exists (dedup)
5. Create Workout documents for new ones (verificationStatus: VERIFIED)
6. Return { created, alreadyExists }

Rate limit all import endpoints: 20 req/min per user (OCR is expensive).
```

---

### PROMPT 05 — Post Composer + Social Feed

```
Build the complete post creation system and social feed for ICHOR.

POST COMPOSER (apps/web/app/(app)/import/compose/page.tsx):

Receives workoutId via query param. Fetches workout data on mount.

Full-page dark layout. Sections:

1. WORKOUT PREVIEW CARD (read-only, top):
Dark card with lavender border. Shows: activity icon + type, distance, duration, pace, calories in a 4-column stat strip. Cannot be edited here.

2. PHOTOS (required):
Grid upload zone. Min 1 photo required. Max 5. Drag-drop + click.
Direct Cloudinary upload: POST /api/upload → get signed URL → upload direct from browser.
Show thumbnails with X to remove.

3. CAPTION: Textarea, 300 char limit with live counter.

4. LOCATION: LocationTagger component (from Prompt 04).
If new territory: show "Name your territory" input below.

5. DIET HONESTY CARD (collapsible section, titled "Fuel Log"):
Toggle open shows: textarea "What did you eat today? Be honest."
Submit button "Analyze with Dhruv" → POST /api/coach/diet-analyze → show result card:
  CLEAN: green badge "Fuelled Right 🥗" + "+50 Integrity Points"
  CHEAT: red badge "Cheat Day 🍕" + "-10% calorie score"
  NEUTRAL: gray badge "Mixed Fuel" + "+25 Integrity Points"
Calories In vs Calories Out balance bar (visual bar showing deficit/surplus).
User can dismiss (skips diet card, no penalty).

6. VISIBILITY TOGGLE: Public / Clan Only / Private

7. POST BUTTON: Large, rounded-full, #AE93F4 fill, "Post to ICHOR"

On submit:
- POST /api/posts with all data
- On success: redirect to /feed with toast "Your run is live. Territory updated."

ACTIVITY FEED (apps/web/app/(app)/feed/page.tsx):

useInfiniteQuery against GET /api/feed?cursor=&filter=
Filter tabs: All | Following | Clan | My Territory | Top Today

ActivityCard (components/features/ActivityCard.tsx):
- Dark card (#1A1619), lavender left border accent, subtle glow on hover
- Header: Avatar (40px circle), Name (Inter Bold), time ago (Inter Light, muted), activity badge pill, VerificationBadge
- Hero photo (16:9, rounded-xl, full width)
- Stats strip: 4 StatChip components (Distance | Pace | Duration | Calories)
- DietHonestyCard component (if present): shows classification badge, calories in/out bar, net balance
- Territory chip: "📍 [Territory Name] — #[rank] on leaderboard" in lavender pill
- Caption (3 lines, "See more" expand)
- Screenshot proof: if OCR, small "📷 Verified Screenshot" thumbnail, tap to expand modal
- Footer: FlameRating (5 flame icons, tap rates 1–5, shows average), comment icon + count, kudos button, share

FlameRating component:
- 5 flame icons (🔥 filled lavender, empty gray)
- Tap to rate. Sends POST /api/posts/:id/flame { rating: 1-5 }
- Show average rating with count "4.2 (47 ratings)"
- Highlight user's own rating

DietHonestyCard component:
- Small card below stats strip
- Shows: badge (color-coded), emoji + label
- Calorie balance bar: left = in (pink), right = out (lavender), center line = balance
- Net: "+320 cal deficit 🔥" or "-180 cal surplus 🧁"
- Emoji reaction row (optional): 👏 💪 🍕 reactions

BACKEND:

POST /api/posts:
1. Validate with Zod (workoutId, photoUrls, location, isPublic, dietCard optional)
2. If new territory name provided: create Territory document with centroid
3. Save Post with all fields including computed weeklyScore and territoryScore (call scoreService)
4. Update workout.verificationStatus to VERIFIED
5. Update User stats: totalWorkouts++, totalCalories += caloriesBurned, totalDistanceKm += distanceKm
6. Add user score to Upstash Redis sorted set: ZADD lb:weekly:{YYYY-WW} score userId
7. Add to district sorted set: ZADD lb:district:{district}:{YYYY-WW} score userId
8. Add to city sorted set: ZADD lb:city:{city}:{YYYY-WW} score userId
9. Emit Socket.io event: io.to('feed').emit('feed:new_post', { postPreview })
10. Run territory claim async (setImmediate): check if user beats current territory owner score → update Territory

GET /api/feed?cursor=&filter=:
- cursor = last post _id (string)
- If filter=following: match userId in user's following list
- If filter=clan: match userId in same clan members
- If filter=territory: match posts in user's territories
- If filter=top: sort by (flameCount + kudosCount) desc, last 24h only
- Default: all posts, sorted by createdAt desc
- Limit 20. Populate: userId (name, avatarUrl), workoutId (stats), location.territoryId (name, rank)
- Return { posts, nextCursor }

POST /api/posts/:id/flame: upsert FlameRating. Recompute avgFlameRating via aggregation. Return new avg.
POST /api/posts/:id/kudos: toggle. Return new count.
POST /api/posts/:id/flag: increment. If flagCount >= 3: set workout.verificationStatus FLAGGED, emit admin alert.
GET /api/posts/:id/comments: return flat list with nested replies resolved.
POST /api/posts/:id/comments: create, return populated comment.
POST /api/upload: generate Cloudinary signed upload params server-side. Return { signature, timestamp, cloudName, apiKey }.
```

---

### PROMPT 06 — Territory System + Map

```
Build the territory system, map display, and attack/challenge flow for ICHOR.

TERRITORY MAP PAGE (apps/web/app/(app)/map/page.tsx):

Uses Google Maps JavaScript API loaded via @googlemaps/js-api-loader.

Map setup:
- Dark map style (use Google Maps nightMode or custom JSON style matching #231F20 background)
- On mount: fetch GET /api/territories/nearby?lat=&lng=&radius=5000
- If no location available: show all territories, center on college campus coordinates

Territory markers:
- Each territory displayed as a circle (500m radius) on the map
- Color: owner's clan color or #AE93F4 for independent owners
- User's own territories: #AE93F4 glow pulse animation
- Unclaimed areas: gray, dashed border
- Circle opacity: 0.3 fill, 0.8 stroke

Click territory circle: open right-side panel (not modal):
- Territory name (Neighbour font, large)
- Owner avatar + name + career score
- "Territory Leaderboard" — top 5 runners this week with scores
- User's rank on this territory this week
- Buttons:
  - If not user's territory: "⚔️ Challenge for Territory" button (#AE93F4)
  - If user's territory: "🛡 Defend" button (shows incoming attacks)
  - "View All Runs Here" → links to territory detail page

"Find My Area" button (top right of map):
- GPS ping → centers map on user, fetches local territories
- Shows "You are in [District], [City]" toast

TERRITORY DETAIL PAGE (app/(app)/territory/[id]/page.tsx):
- Header: territory name, owner badge, total runs logged here
- This week's leaderboard (full list)
- All posts tagged to this territory (feed subset)
- Attack history (recent battles)

TERRITORY SERVICE (apps/api/src/services/territoryService.ts):

claimOrUpdateTerritory(userId, lat, lng, territoryScore, newTerritoryName?):
- findNearbyTerritory(lat, lng) within 500m
- If none exists AND newTerritoryName provided: create Territory, set owner to userId
- If exists: update weeklyLeaderboard array for this user (upsert by userId, update score)
- Sort weeklyLeaderboard by score desc, assign ranks
- If rank 1 changed: update currentOwnerId, send push notification to displaced owner
- If top 3 are all same clan: update currentClanOwnerId

ATTACK FLOW:

"Challenge for Territory" button → opens challenge sheet:
- Shows user's weekly score vs owner's weekly score on this territory
- Option 1: "📊 Stat Battle" — submit at end of week, best score wins
- Option 2: "🏃 Sprint Duel" — create a group run session for this territory
- POST /api/attacks { territoryId, type }

On accept (defender): attack status → ACCEPTED
On forfeit (defender): transfer territory → attackerId, attacker wins, notifications sent

BACKEND:

GET /api/territories/nearby?lat=&lng=&radius=:
- Territory.find({ centroid: { $near: { $geometry: { type:'Point', coordinates:[lng,lat] }, $maxDistance: radius }}})
- Populate currentOwnerId (name, avatarUrl, clanId), currentClanOwnerId (color)
- Return GeoJSON-compatible array with radius for circle rendering

GET /api/territories/:id:
- Full territory with weeklyLeaderboard populated (user names, avatars)
- Recent posts tagged here (last 20)
- Attack history (last 10)

POST /api/territories (called from post flow if new territory named):
- Validate name (3-50 chars, no profanity filter)
- Check no territory within 500m (prevent duplicates)
- Create with centroid, createdBy, initial owner

POST /api/attacks:
- Validate attacker has posted in this territory this week (cannot attack territories you haven't run in)
- Check no PENDING attack already exists for this territory
- Create Attack, notify defender via FCM

POST /api/attacks/:id/respond:
- ACCEPT: status → ACCEPTED, notify attacker
- FORFEIT: call resolveAttack(attackId, attackerId), notify both

POST /api/attacks/:id/resolve:
- Body: { winnerId }
- Update Territory.currentOwnerId
- Update User.stats.battlesWon/battlesLost for both
- FCM to both users
- Status → RESOLVED
```

---

### PROMPT 07 — Leaderboards + Scoring Engine

```
Build all 11 leaderboard categories and the complete scoring engine for ICHOR.

SCORING ENGINE (apps/api/src/services/scoreService.ts):

Apply Strategy Pattern — each scorer implements IScorer interface: { calculate(userId, week): Promise<number> }

calculateWeeklyScore(userId, week):
1. Fetch all posts for userId in given week (workoutDate in range)
2. baseCalories = sum caloriesBurned
3. activeDays = count distinct days with posts
4. consistencyMultiplier = MIN(1.0 + (activeDays-1)×0.1, 2.0)
5. avgPace = weighted average of avgPaceMinPerKm across posts
6. paceBonus = pace < 5 → 1.3, 5-6 → 1.15, 6-7 → 1.0, >7 → 0.9
7. integrityBonus = count(CLEAN diet cards this week) × 50
8. cheatPenalty = count(CHEAT diet cards) × (baseCalories × 0.10)
9. weeklyScore = (baseCalories × consistencyMultiplier × paceBonus) + integrityBonus - cheatPenalty
10. Update User.stats.weeklyScore in MongoDB

calculateTerritoryScore(userId, territoryId, week):
1. Fetch posts where location.territoryId = territoryId, userId, in week
2. territoryScore = sum(caloriesBurned × paceBonus per post)
3. Return score

updateAllRedisLeaderboards(userId, weeklyScore, district, city, week):
1. ZADD lb:weekly:{week} weeklyScore userId
2. ZADD lb:district:{district}:{week} weeklyScore userId
3. ZADD lb:city:{city}:{week} weeklyScore userId
4. ZADD lb:calories:{week} totalCalories userId (separate — raw calories, no multipliers)
5. ZADD lb:distance:{week} totalDistanceKm userId
All with TTL 8 days (covers full week + buffer)

LEADERBOARD PAGE (apps/web/app/(app)/leaderboard/page.tsx):

Tab navigator (horizontal scroll on mobile): 11 tabs

Tabs: Global | Weekly | My District | My City | Calorie King | Pace God | Distance | Streak | Integrity | Territories | Clan Wars

Each tab: GET /api/leaderboards/{category}?week=&lat=&lng= (lat/lng for local boards)

"Find My Area" button (top of page): one GPS ping → auto-loads District and City tabs for user's location.

LeaderboardRow component:
- Rank: gold (1st), silver (2nd), bronze (3rd), plain number rest
- Avatar (32px)
- Name + clan tag (small badge in clan color)
- Score value + unit
- "YOU" pill if current user
- Delta: ↑3 (green) / ↓2 (red) / — (gray) vs last week

Territory leaderboard tab:
- Dropdown: select from user's territories
- Shows all runners who've posted in that territory this week

BACKEND LEADERBOARD ENDPOINTS (all use Upstash Redis ZREVRANGE with scores, fall back to MongoDB aggregation if Redis miss):

GET /api/leaderboards/weekly?week=:
- ZREVRANGEBYSCORE lb:weekly:{week} +inf -inf WITHSCORES LIMIT 0 50
- Batch fetch User names/avatars by userId array

GET /api/leaderboards/local?lat=&lng=&type=district|city:
- Reverse geocode lat/lng → get district or city string
- ZREVRANGE lb:district:{district}:{week} or lb:city:{city}:{week}

GET /api/leaderboards/territory/:id?week=:
- Territory.findById → weeklyLeaderboard array (already computed and sorted in territory doc)
- No Redis needed — stored in MongoDB

GET /api/leaderboards/calories, /distance, /streak, /integrity:
- calories: ZREVRANGE lb:calories:{week}
- distance: ZREVRANGE lb:distance:{week}
- streak: User.find().sort({ 'stats.streakDays': -1 }).limit(50) — from MongoDB (not cached, changes daily)
- integrity: User.find().sort({ 'stats.integrityPoints': -1 }).limit(50)

GET /api/leaderboards/clans:
- Clan.find().sort({ 'stats.weeklyScore': -1 }).limit(20)
- Populate: member count, territories held count

GET /api/leaderboards/global:
- User.find().sort({ 'stats.careerScore': -1 }).limit(50)

NODE-CRON JOBS (apps/api/src/jobs/):

weeklyReset.ts — runs Monday 00:00 IST (cron: '0 0 * * 1', timezone: 'Asia/Kolkata'):
- Save top 3 per category to LeaderboardHistory
- Delete all lb:* Redis keys for current week
- Reset Territory.weeklyLeaderboard[].score = 0 for all territories
- Reset User.stats.weeklyScore = 0 for all users
- Recompute clan weekly scores
- Log: "Weekly reset complete: [timestamp], [count] users affected"

dailyStreak.ts — runs 23:59 IST every day:
- For each user: check if Post created today (workoutDate = today)
- If yes: User.stats.streakDays++, User.stats.longestStreak = MAX(longestStreak, streakDays)
- If no: User.stats.streakDays = 0
- Batch update (bulkWrite for performance — do NOT loop individual saves)

streakReminder.ts — runs 20:00 IST every day:
- Find users where streakDays >= 3 AND no post today
- Send FCM push: "🔥 Keep your streak alive! You're on a [N]-day streak."

challengeExpiry.ts — runs every hour:
- Find Attacks where status=PENDING AND createdAt < 48 hours ago
- Set status=EXPIRED, send FCM to both users, territory stays with defender
```

---

### PROMPT 08 — Group Runs + Real-time + Clan System

```
Build the group run feature with live leaderboards, Socket.io real-time, and the full clan system.

SOCKET.IO SETUP (apps/api/src/app.ts):

Initialize Socket.io with CORS for Vercel domain.
Rooms:
- 'feed' — all connected users (new post notifications)
- 'grouprun:{id}' — participants of a specific group run
- 'clan:{id}' — clan chat room
- 'territory:{id}' — territory update notifications

Auth middleware for Socket.io: verify Clerk JWT from socket.handshake.auth.token.

GROUP RUN FLOW:

Create Group Run (app/(app)/grouprun/page.tsx → POST /api/groupruns):
- Form: title, type (Competitive/Friendly), location (LocationTagger), start time, max participants (2–20)
- On create: get 6-char session code → show shareable link: ichor.app/join/{code}

Lobby Page (app/(app)/grouprun/[id]/page.tsx):
- Participant list with READY / NOT READY chips
- "Ready Up" toggle button
- Countdown timer to startAt
- Session code display (large, copyable)
- Clan chat sidebar using Socket.io 'grouprun:{id}' room
- "Start Run" button (host only, all ready OR countdown ends)
- On start: server emits 'grouprun:started' to room → all clients redirect to live page

Live Run Page (app/(app)/grouprun/[id]/live/page.tsx):

This page runs during the group run. Three mechanisms in priority order:

Mechanism 1 — Google Fit Live Sync (every 60s):
- If user has connected Google Fit (googleFitRefreshToken exists):
- setInterval(60000): POST /api/groupruns/:id/sync with { userId, source: 'google_fit' }
- Backend: refresh token → fetch latest running session from Fit API → extract current distance, pace, calories
- Emit to Socket.io room: io.to('grouprun:{id}').emit('participant:update', { userId, distanceKm, pace, calories })
- Frontend receives → updates live leaderboard

Mechanism 2 — Manual Checkpoint Submit (fallback):
- If no Google Fit: show checkpoint buttons: "🏁 1km" "🏁 2km" "🏁 3km" "🏁 4km" "🏁 5km+"
- User taps as they pass each km
- Sends POST /api/groupruns/:id/checkpoint { userId, distanceKm, timestamp }
- Same Socket.io broadcast

Live Leaderboard component (GroupRunLiveBoard.tsx):
- Dark card, updates without full re-render (update Zustand slice on socket event)
- Animated rank changes: smooth position swap animation via Reanimated-style CSS transitions
- Shows: rank, avatar, name, current distance, current pace, calories
- Flashes gold when rank 1 changes

End of Run:
- Each participant taps "Finish" or uploads final screenshot
- POST /api/groupruns/:id/finish { userId, finalStats }
- When all finish (or host ends): POST /api/groupruns/:id/end
- COMPETITIVE: winner's stats vs territory owner → if better, initiate auto attack → territory claim
- FRIENDLY: all participants get co-run badge
- Final leaderboard shown on results page

GROUP RUN BACKEND ENDPOINTS:
POST /api/groupruns — create, generate sessionCode
GET /api/groupruns/join/:code — find by sessionCode, return id
POST /api/groupruns/:id/join
POST /api/groupruns/:id/ready
POST /api/groupruns/:id/start (host only)
POST /api/groupruns/:id/sync (Google Fit update)
POST /api/groupruns/:id/checkpoint (manual)
POST /api/groupruns/:id/finish (individual done)
POST /api/groupruns/:id/end (host ends session)

CLAN SYSTEM:

Clan List (app/(app)/clans/page.tsx):
- Top 20 clans by weeklyScore, search by name or tag
- "Create Clan" button if not in a clan

Clan Create (modal): name, tag (4 chars, auto uppercase), color picker (8 brand-palette options), diet pact text (optional)

Clan Detail (app/(app)/clans/[id]/page.tsx):
- Hero: clan color banner, tag badge, name, weekly score, territories count
- Diet Pact card (if set)
- Member list (Leader badge, weekly scores)
- Territory section: list of clan-held territories
- Clan Wars: active attacks involving any clan member
- Chat: Socket.io room 'clan:{id}' — simple text chat, messages not persisted (ephemeral)
- Action buttons: Join (if not in clan) / Leave / Edit (leader) / Declare War on Clan

Clan War:
- Leader selects enemy clan → POST /api/clans/:id/war/:enemyClanId
- Top 3 runners of each clan this week compared by weeklyScore
- Best-of-3: each member matchup. Clan with 2+ wins takes 1 territory from losing clan
- Auto-resolved at end of week in weeklyReset job

BACKEND CLAN ENDPOINTS:
POST /api/clans, GET /api/clans, GET /api/clans/search?q=, GET /api/clans/:id
POST /api/clans/:id/join (check max 15, remove from old clan)
POST /api/clans/:id/leave (auto-promote leader)
DELETE /api/clans/:id/members/:userId (leader only)
PATCH /api/clans/:id (leader only)
POST /api/clans/:id/war/:enemyClanId
```

---

### PROMPT 09 — Gemini AI Features

```
Implement all Gemini AI features: screenshot OCR, AI coach Dhruv, diet analyzer, training plan.

GEMINI SERVICE (apps/api/src/services/geminiService.ts):

Initialize @google/generative-ai with GEMINI_API_KEY.
Model: gemini-1.5-flash for all features (fastest, free tier friendly).
Export: parseScreenshot(imageUrl), analyzeDiet(description, caloriesBurned), chat(systemPrompt, history, message), generateTrainingPlan(workoutSummary).

FEATURE 1 — SCREENSHOT OCR (already wired in Prompt 04, finalize prompt engineering here):

parseScreenshot(imageUrl):
System instruction: "You are a fitness data extraction engine. You will see a screenshot from a fitness tracking app. Extract the workout data precisely. Return ONLY a raw JSON object with no markdown fences, no explanation, no preamble. Schema: { activityType: 'RUN'|'WALK'|'CYCLE', distanceKm: number, durationSeconds: number, avgPaceMinPerKm: number|null, caloriesBurned: number, heartRateAvg: number|null, workoutDate: 'YYYY-MM-DD' }. If any field is not clearly visible in the screenshot, set it to null. Never guess. Never fabricate."
Handle: try JSON.parse, if fails try to extract JSON from string with regex, if still fails return { error: true }.
Log Gemini response for debugging (not in production).

FEATURE 2 — DIET ANALYZER:

POST /api/coach/diet-analyze:
Request: { description: string, caloriesBurned: number }
analyzeDiet(description, caloriesBurned):
System instruction: "You are a sports nutritionist AI for ICHOR, a competitive fitness app. The user describes their food intake. Analyze it in the context of athletic performance. Return ONLY raw JSON: { classification: 'CLEAN'|'CHEAT'|'NEUTRAL', estimatedCaloriesIn: number, integrityBonus: number, netCalorieBalance: number, tip: string }. Rules: CLEAN = majority whole foods, lean proteins, complex carbs → integrityBonus: 50. CHEAT = junk food, excessive sugar, fried food, alcohol → integrityBonus: 0. NEUTRAL = mixed or insufficient info → integrityBonus: 25. netCalorieBalance = estimatedCaloriesIn - caloriesBurned (positive = surplus, negative = deficit). tip = one sentence, max 15 words, motivating and specific."
Return parsed object. Save to Post.dietCard on post creation.

FEATURE 3 — AI COACH DHRUV:

Chat page (apps/web/app/(app)/coach/page.tsx):
Full-page dark layout. Left sidebar: conversation history (collapsible). Main area: chat.

UI:
- DHRUV avatar: abstract lavender geometric shape (SVG), not a human face
- User messages: right-aligned, #AE93F4 pill background, dark text
- Dhruv messages: left-aligned, #2D2630 pill, lavender text, DHRUV label in Neighbour font
- Typing indicator: three dots pulsing in #AE93F4
- Input: dark rounded input bar with send button
- Starter chips before first message (horizontal scroll):
  "Analyze my week 📊"
  "How do I burn more? 🔥"
  "Plan my training 🗓"
  "Should I accept this challenge? ⚔️"
  "Best pace strategy for 5km? 🏃"

POST /api/coach/chat:
Request: { message: string, history: [{role: 'user'|'model', parts: [{text: string}]}][] }
1. Fetch user's last 30 days posts: distanceKm, caloriesBurned, avgPaceMinPerKm, workoutDate, weeklyScore
2. Compute: totalDistanceThisMonth, avgCaloriesPerRun, bestPace, currentStreak, weeklyScore, territoriesHeld, battlesWon, battlesLost
3. Build system prompt: "You are Dhruv, the AI performance coach for ICHOR — a campus social fitness battleground. You are intense, data-driven, and motivating. Keep responses mobile-optimized: max 3 short paragraphs, no markdown headers or bullet formatting. Use the user's actual data in responses. User data: totalDistanceThisMonth={X}km, avgCaloriesPerRun={X}, bestPaceMinPerKm={X}, currentStreak={X} days, weeklyScore={X}, territoriesHeld={X}, battlesWon={X}. College: {college}."
4. Call Gemini: generateContent with conversation history + new message. Temperature 0.8, maxOutputTokens 400.
5. Return { reply: string }

Frontend: keep conversation history in useState. Send full history with every message. Show typing indicator while awaiting response.

FEATURE 4 — WEEKLY TRAINING PLAN:

POST /api/coach/training-plan:
1. Fetch last 4 weeks of user posts
2. Compute: avgWeeklyRuns, avgWeeklyDistanceKm, avgPace, trend (improving/declining/stable)
3. Gemini prompt: "Generate a 7-day training plan for a college runner with these recent stats: {summary}. Return ONLY a JSON array (no markdown): [{ day: 'Monday', type: 'Rest'|'Easy'|'Tempo'|'Long'|'Sprint'|'Cross-train', distanceKm: number|null, targetCalories: number, durationMinutes: number, notes: string }]. Keep notes under 20 words. Progressive overload: hard days followed by easy days. Weekend = longest run."
4. Parse JSON array. Cache result in user's profile (update User.weeklyPlan field — add this field to User model).
5. Return array.

Frontend: display on profile page as horizontal 7-day card scroll. Each day: type badge (color coded), distance target, calorie target, notes. "Today" highlighted in lavender.

Rate limit /api/coach/* endpoints: 10 req/min per user (Gemini free tier protection).
```

---

### PROMPT 10 — Push Notifications + All Cron Jobs

```
Build the complete push notification system using Firebase Web Push and finalize all node-cron jobs.

FIREBASE WEB PUSH SETUP:

Frontend (apps/web):
- Install firebase (client SDK)
- Create lib/firebase.ts: initialize app with config from env vars
- Request notification permission on app load (after login): Notification.requestPermission()
- Get FCM registration token: getToken(messaging, { vapidKey: NEXT_PUBLIC_FIREBASE_VAPID_KEY })
- PATCH /api/users/fcm-token with token
- Handle foreground messages: messaging().onMessage() → show in-app toast notification

Backend (apps/api):
- firebase-admin initialized with FIREBASE_SERVICE_ACCOUNT_JSON
- notificationService.ts: sendPush(userId, { title, body, data })
  1. Fetch user.fcmToken from MongoDB
  2. If null: skip
  3. firebase-admin messaging().send({ token, notification: { title, body }, data, webpush: { fcmOptions: { link: data.deepLink } } })
  4. On error (token invalid): clear user.fcmToken in DB

ALL NOTIFICATION TYPES (implement all 9):

1. TERRITORY_CHALLENGED: "⚔️ Your Territory is Under Attack" — "[Name] is challenging [Territory Name]. Respond within 48 hours." — deepLink: /map
2. CHALLENGE_ACCEPTED: "✅ Challenge Accepted" — "[Name] accepted your challenge for [Territory Name]." — deepLink: /territory/{id}
3. TERRITORY_LOST: "💥 Territory Lost" — "[Name] claimed [Territory Name]. Time to reclaim it." — deepLink: /map
4. TERRITORY_CLAIMED: "🏆 Territory Claimed" — "You now own [Territory Name]!" — deepLink: /territory/{id}
5. KUDOS_RECEIVED: "👊 [Name] sent you kudos" — "They loved your [X]km run." — deepLink: /feed
6. CHALLENGE_EXPIRING: "⏰ Challenge Expiring" — "Your challenge for [Territory Name] expires in 24 hours. Respond now!" — deepLink: /map
7. STREAK_REMINDER: "🔥 Protect Your Streak" — "You're on a [N]-day streak. Post today to keep it alive!" — deepLink: /import
8. GROUP_RUN_STARTING: "🏁 Group Run Starts in 15 Minutes" — "[Title] — Get ready at [Location]!" — deepLink: /grouprun/{id}
9. CLAN_WAR_DECLARED: "⚔️ Clan War!" — "[Enemy Clan] declared war on your clan. Top 3 runners, step up!" — deepLink: /clans/{id}

ALL NODE-CRON JOBS (finalize apps/api/src/jobs/index.ts that starts all jobs):

Job 1: weeklyReset — every Monday 00:00 IST
Full implementation (see Prompt 07). Add:
- Resolve any pending Clan Wars (compare top 3 vs top 3)
- Award weekly winner badges (Calorie King, Pace God, Distance Destroyer)
- Save LeaderboardHistory records

Job 2: dailyStreak — every day 23:59 IST
BulkWrite update for all users. Max 200 users = fast.

Job 3: streakReminder — every day 20:00 IST
Find users with streakDays >= 3 + no post today. Batch FCM sends.

Job 4: challengeExpiry — every hour
PENDING attacks > 48 hours old → EXPIRED. FCM both parties.

Job 5: groupRunReminder — every 5 minutes
GroupRuns with startAt between now and now+16min, status LOBBY, reminderSentAt null.
Send GROUP_RUN_STARTING push to all participants. Set reminderSentAt.

Job 6: territoryOwnershipRecalc — every day 02:00 IST
For each territory: re-sort weeklyLeaderboard by score, update currentOwnerId if changed.
Notify new owner and displaced owner.

Job 7: scoreSync — every 6 hours
For top 100 users (by weekly activity): recalculate weeklyScore, update Redis sorted sets.
Keeps leaderboards accurate even if a score update was missed.

All jobs: wrap in try-catch, log start/end/duration, log errors to Sentry.
```

---

### PROMPT 11 — Profile + Admin + Polish + Launch

```
Build the profile system, admin dashboard, complete the UI polish, and prepare for launch.

PROFILE PAGE (apps/web/app/(app)/profile/[userId]/page.tsx):

Header section:
- Large avatar (96px), name in Neighbour display font
- Clan badge (color-coded tag)
- Career Score prominently: large number, gold gradient text, "Career Score" label
- Follow / Message / Challenge buttons (if not own profile)
- Edit Profile button (if own profile)

Stats row (4 cards, dark with lavender accent):
- Total Distance (km) | Total Workouts | Total Calories | Territories Held

Battle record: Wins vs Losses — horizontal bar, wins in lavender, losses in muted pink.
Streak display: current streak (flame icon + number), personal best streak.
Integrity tier: based on integrityPoints — Novice / Committed / Honest Athlete / Integrity Champion.

Weekly Training Plan card (collapsible):
- Auto-fetches from POST /api/coach/training-plan on profile load if none cached
- 7-day horizontal scroll, each day a mini card

Activity heatmap (GitHub-style, 52 weeks):
- Each cell = calorie score that day (0 = dark gray, max = bright lavender)
- Hover shows date + calories + workout type

Badges section: horizontal scroll, earned badges only:
- First Run, Streak 7, Streak 30, Streak 100
- Calorie King (won weekly lb), Territory Conqueror (5+ zones), Battle Hardened (10 wins)
- Integrity Champion (30 consecutive CLEAN logs), Clan Chief (created a clan)
- Speed Demon (sub-5 pace), Distance King (100km month)

My Territories: list of territories owned + rank on each.
My Posts grid: 3-column photo grid, tap to open post.

BADGE SYSTEM (apps/api/src/services/badgeService.ts):
checkAndAwardBadges(userId) — call after every post save, score update, or battle resolution.
For each badge: check condition from User stats → if met and not already awarded → push to user.badges array + send FCM notification.

ADMIN DASHBOARD (/admin route group, protected by ADMIN_SECRET header):

GET /admin — summary stats: total users, posts today, active group runs, total territories, flagged posts count
GET /admin/flagged — posts with flagCount >= 3, with screenshot URL and flagger count
POST /admin/posts/:id/verify — reset flagCount, set verificationStatus VERIFIED
POST /admin/posts/:id/remove — delete post, decrement user stats
GET /admin/territories — all territories with owner info
POST /admin/territories — create territory manually (with GeoJSON polygon or point + radius)
DELETE /admin/territories/:id
GET /admin/users — paginated user list with stats
POST /admin/users/:id/ban — set user.isBanned, revoke all sessions via Clerk API

GLOBAL UI POLISH (apply across all pages):

Error Boundaries: wrap every page in ErrorBoundary component. Custom error page showing ICHOR logo + "Something broke. We're on it." in brand style.

Loading skeletons: every list, card, and stat uses skeleton animation (Tailwind animate-pulse, dark background shimmer). No blank pages ever.

Empty states: every list with no data shows branded empty state:
- Icon (SVG), headline in Neighbour font, subtext in Inter Light, action button
- Examples: "No runs posted yet. Import your first workout." / "No territories claimed. Tag a location on your next post."

Toast notifications: bottom-center toast system for all actions. Success = lavender, Error = pink, Info = gray. Auto-dismiss 4 seconds.

Offline detection: window.addEventListener('offline') → show top banner "You're offline. Data will sync when reconnected." in amber.

Image optimization: all images via Next.js <Image> component with Cloudinary URLs using f_auto,q_auto transformation params.

Page transitions: subtle fade-in on route change via CSS animation.

Mobile responsiveness: all pages mobile-first. Test at 375px width. Bottom navigation bar on mobile (Feed, Import, Map, Leaderboard, Profile).

SENTRY INTEGRATION:
- Install @sentry/nextjs and @sentry/node
- Next.js: sentry.client.config.ts, sentry.server.config.ts
- Express: Sentry.init in app.ts, add requestHandler and errorHandler middleware
- All catch blocks: Sentry.captureException(err)
- Source maps uploaded on build

RATE LIMITING SUMMARY (express-rate-limit on all routes):
- /api/feed: 120 req/min
- /api/leaderboards: 60 req/min
- /api/workouts/ocr: 20 req/min (Gemini expensive)
- /api/coach/*: 10 req/min
- /api/posts: 30 req/min
- All other /api/*: 100 req/min

LAUNCH CHECKLIST:
1. All env vars set in Vercel and Railway dashboards
2. MongoDB Atlas: enable network access for Railway IP (or allow all: 0.0.0.0/0)
3. 2dsphere index confirmed on Territory.centroid
4. Clerk webhook pointing to production /api/webhooks/clerk URL
5. Firebase: add Vercel domain to authorized domains
6. Google Maps API: restrict key to Vercel domain
7. Cloudinary: set upload preset to signed
8. node-cron timezone confirmed as Asia/Kolkata
9. Sentry project configured, test error captured
10. Load test: simulate 500 concurrent users with k6 (free) before launch
```

---

*ICHOR PRD v2.0 — Complete*
*Stack: Next.js + Express + MongoDB + Upstash Redis + Gemini + Clerk | Cost: $0*
*Capacity: 500–700 concurrent users | Principles: SOLID throughout*