# ICHOR — Antigravity Super Prompts
## All 11 Prompts, Fully Updated for Final Stack
### Next.js · MongoDB · Upstash Redis · Clerk · Gemini · node-cron · Vercel + Railway

> **How to use:** Attach `ichor.prd.md` to your Antigravity project first.
> Paste the Master Orchestrator Prompt once. Then feed prompts 01–11 one at a time.
> Never skip. Never reorder. Wait for explicit approval before the next prompt.

---

## MASTER ORCHESTRATOR PROMPT
### Paste this FIRST into Antigravity Agent Manager

```
You are the Lead Principal Software Engineer behind ICHOR — a campus-exclusive social fitness
battleground. Read ichor.prd.md fully before writing a single line of code. Then implement
the entire application systematically using Review-driven development.

NON-NEGOTIABLE ARCHITECTURE RULES:

1. STACK IS FIXED. No substitutions.
   Frontend: Next.js 14 App Router + TypeScript strict + Tailwind CSS + shadcn/ui → Vercel
   Backend:  Node.js + Express + Mongoose → Railway
   Database: MongoDB Atlas M0 (free tier, 512MB)
   Cache:    Upstash Redis REST client (@upstash/redis)
   Auth:     Clerk (@clerk/nextjs + @clerk/express)
   AI:       Google Gemini 1.5 Flash (@google/generative-ai)
   Media:    Cloudinary (signed uploads, browser-direct)
   Push:     Firebase Admin FCM (web push)
   Maps:     Google Maps JavaScript API (@googlemaps/js-api-loader)
   Jobs:     node-cron (in-process on Railway — zero extra cost)
   Do NOT add any package not listed above without asking first.

2. ZERO GPS TRACKING. Location is captured exactly once via
   navigator.geolocation.getCurrentPosition() at post-upload time only.
   If that fails → Google Maps JS embed → user taps pin.
   No background location. No tracking. No expo-location. No paths.

3. NEXT.JS WEB APP ONLY. No React Native. No mobile app. No Expo.
   The app is a Next.js 14 App Router web application deployed to Vercel.
   It must be fully responsive and usable on mobile browsers.

4. TERRITORY IS ZONE-BASED VIA MONGODB 2dsphere.
   Territory = a named area (user-created) stored as a GeoJSON Point + 500m radius.
   Ownership = user with highest weeklyScore among all runners who posted in that zone.
   No predefined zones. Users create territories when they are first to post in an area.

5. SOLID PRINCIPLES — MANDATORY throughout the backend:
   S: One route file per domain. One controller per route file. One service per concern.
   O: Score calculator uses Strategy pattern. New categories = new strategy, no edits.
   L: All import methods (OCR, Google Fit, manual) implement IImportStrategy interface.
   I: Repositories expose only the queries their consumers need. No god-object repos.
   D: Controllers depend on service interfaces, not concrete implementations.
      Services depend on repository interfaces, not Mongoose models directly.

6. SCALE: Designed for 500–700 concurrent users.
   MongoDB: Mongoose connection pool maxPoolSize: 10.
   All list endpoints: cursor-based pagination (never offset). Limit 20 per page.
   No N+1 queries: use .populate() or aggregation pipelines, never loops with DB calls.
   All leaderboards served from Upstash Redis sorted sets. MongoDB = source of truth only.
   Rate limiting on every route via express-rate-limit.

7. DIET HONESTY CARD is a core product feature. It appears on every activity card.
   Never skip it. Never stub it. Always implement it fully.

8. LEADERBOARDS: Weekly data lives in Upstash Redis sorted sets.
   Key pattern: lb:{category}:{YYYY-WW} for weekly. lb:{category}:alltime for career.
   node-cron resets weekly keys every Monday 00:00 IST.
   Local boards: lb:district:{districtSlug}:{YYYY-WW} and lb:city:{citySlug}:{YYYY-WW}

9. GROUP RUN LIVE LEADERBOARD priority:
   Primary:  Google Fit REST API polled every 60s per participant → Socket.io broadcast
   Fallback: Manual checkpoint submit buttons (1km, 2km, 3km, etc.) → same Socket.io flow
   Both paths emit identical Socket.io event: participant:update { userId, distanceKm, pace, calories }

10. BRAND — every UI component must follow:
    Primary:    #AE93F4  (lavender — "Momentum")
    Background: #231F20  (near-black — "Midnight Run")
    Accent:     #FDA2DE  (pink blush — "After Run")
    Gold:       #D4AF37  (leaderboard top 3)
    Display:    Neighbour font (bold condensed, all-caps for headings) via @font-face
    Body:       Inter (300 Light, 700 Bold) via Google Fonts
    Cards:      dark (#1A1619), lavender left border, subtle glow on hover
    Buttons:    rounded-full, #AE93F4 fill, dark (#231F20) text
    Tagline:    "Turn Sweat Into Lore" — shown in hero sections

EXECUTION RULES:
- Read ichor.prd.md and summarise understanding in exactly 3 bullet points.
- Ask maximum 2 clarifying questions before starting Prompt 01.
- After each prompt: show the complete file tree of what was created or modified,
  show key code snippets for the most complex parts, then ask
  "Prompt 0X complete. Ready to proceed to Prompt 0Y?"
- Never proceed to the next prompt without explicit written approval.
- If you are unsure about any requirement, stop and ask. Do not guess.
- Never implement any feature not in ichor.prd.md without asking first.

Read ichor.prd.md now and confirm understanding.
```

---

## PROMPT 01 — Monorepo Scaffold

```
Scaffold the complete ICHOR application as an npm workspaces monorepo.
Do not implement any logic. Scaffold structure, configs, and empty files only.
Show the complete file tree when done.

MONOREPO ROOT (ichor/):
  package.json with workspaces: ["apps/web", "apps/api", "packages/types", "packages/utils"]
  .gitignore covering node_modules, .env*, .next, dist
  README.md: setup instructions (npm install → configure .env → npm run dev in each app)

━━━ PACKAGE 1: packages/types ━━━
Shared TypeScript interfaces used by both web and api.
Export from index.ts:

IUser: _id, clerkId, email, name, avatarUrl, bio, college, fcmToken
  stats: { totalDistanceKm, totalWorkouts, totalCalories, streakDays,
           longestStreak, integrityPoints, battlesWon, battlesLost,
           careerScore, weeklyScore }
  clanId, badges: IBadge[], weeklyPlan: ITrainingDay[], createdAt

IWorkout: _id, userId, sourceType, activityType, distanceKm, durationSeconds,
  avgPaceMinPerKm, caloriesBurned, heartRateAvg, workoutDate,
  externalId, screenshotUrl, verificationStatus, createdAt

IPost: _id, userId, workoutId, caption, photoUrls, location: IPostLocation,
  isPublic, engagement: IEngagement, dietCard: IDietCard | null,
  weeklyScore, territoryScore, createdAt

IPostLocation: lat, lng, district, city, state, territoryId, territoryName,
  territoryRank, method: 'GPS' | 'MAP_PICK'

IDietCard: description, classification, estimatedCaloriesIn, caloriesBurned,
  netCalorieBalance, integrityBonus, tip

IEngagement: avgFlameRating, flameCount, kudosCount, flagCount

ITerritory: _id, name, createdBy, centroid: IGeoPoint, radiusMeters,
  currentOwnerId, currentClanOwnerId, weeklyLeaderboard: ITerritoryEntry[],
  totalRuns, createdAt

ITerritoryEntry: userId, score, rank

IAttack: _id, attackerId, defenderId, territoryId, status, type,
  scheduledAt, resolvedAt, winnerId, createdAt

IClan: _id, name, tag, leaderId, color, dietPactDescription,
  stats: { weeklyScore, battlesWon, territoriesHeld }
  members: IClanMember[], createdAt

IClanMember: userId, role, joinedAt

IGroupRun: _id, title, hostId, sessionCode, type, location: IGroupRunLocation,
  startAt, endedAt, status,
  participants: IGroupRunParticipant[], createdAt

IGroupRunParticipant: userId, status, checkpoints: ICheckpoint[], finalStats

ICheckpoint: distanceKm, timestamp

ILeaderboardEntry: userId, name, avatarUrl, clanTag, clanColor, score, rank, delta

IBadge: name, awardedAt

ITrainingDay: day, type, distanceKm, targetCalories, durationMinutes, notes

IGeoPoint: type: 'Point', coordinates: [number, number]

━━━ PACKAGE 2: packages/utils ━━━
Shared pure functions. No DB imports. No side effects.

scoreCalculator.ts:
  calculateWeeklyScore(params: {
    baseCalories: number, activeDays: number,
    avgPaceMinPerKm: number, cleanDietLogs: number, cheatDietLogs: number
  }): number
  — implements the full formula from ichor.prd.md Part 4.4
  — uses Strategy pattern: paceStrategy(pace): number returns the multiplier

  calculateTerritoryScore(posts: { caloriesBurned: number, avgPaceMinPerKm: number }[]): number
  calculateCareerScore(params: { weeklyScores: number[], territoriesHeld: number, battlesWon: number }): number

formatters.ts:
  formatPace(minPerKm: number): string  — "5:23 /km"
  formatDistance(km: number): string    — "10.2 km"
  formatDuration(seconds: number): string — "1h 23m"
  timeAgo(date: Date | string): string  — "2 hours ago"
  formatCalories(cal: number): string   — "1,240 kcal"
  weekKey(): string                     — current ISO week "2025-W28"
  districtSlug(district: string): string — lowercase, hyphenated

━━━ APP 1: apps/web ━━━
Next.js 14 App Router, TypeScript strict mode.

tailwind.config.ts:
  theme.extend.colors:
    primary: '#AE93F4'
    background: '#231F20'
    accent: '#FDA2DE'
    gold: '#D4AF37'
    card: '#1A1619'
    muted: '#6B6570'
  theme.extend.fontFamily:
    display: ['Neighbour', 'sans-serif']
    body: ['Inter', 'sans-serif']

globals.css:
  @font-face for Neighbour (woff2 file — scaffold placeholder comment for font file)
  @import Google Fonts Inter 300,700
  body { background: #231F20; color: white; font-family: Inter }

shadcn/ui init: dark theme, primary color #AE93F4.

App Router structure (all pages are empty with correct export default and metadata):
  app/
    layout.tsx          — ClerkProvider + QueryClientProvider + ZustandProvider + font classes
    page.tsx            — public landing (hero: "Turn Sweat Into Lore")
    (auth)/
      login/page.tsx
      register/page.tsx
    (app)/
      layout.tsx        — protected layout with sidebar nav + bottom mobile nav
      feed/page.tsx
      import/
        page.tsx
        compose/page.tsx
      map/page.tsx
      leaderboard/page.tsx
      profile/[userId]/page.tsx
      territory/[id]/page.tsx
      clans/
        page.tsx
        [id]/page.tsx
        create/page.tsx
      grouprun/
        page.tsx
        create/page.tsx
        [id]/
          page.tsx      — lobby
          live/page.tsx — active run
          results/page.tsx
      coach/page.tsx
    api/
      webhooks/clerk/route.ts  — Next.js route handler (proxies to Express or handles inline)

middleware.ts: clerkMiddleware protecting all /app/* routes. Public: /, /login, /register.

Zustand stores (stores/):
  userSlice.ts:   { user: IUser | null, setUser, clearUser }
  importSlice.ts: { pendingWorkouts: IWorkout[], currentDraft: Partial<IPost> | null,
                    setPendingWorkouts, setDraft, clearDraft }
  feedSlice.ts:   { optimisticPosts: IPost[], addOptimistic, removeOptimistic }

lib/queryClient.ts: TanStack Query v5 queryClient (staleTime: 30000, retry: 2, gcTime: 300000)
lib/axios.ts: Axios instance reading NEXT_PUBLIC_API_URL, request interceptor attaches
  Clerk JWT via clerk.session?.getToken()

components/ scaffold (empty with correct TypeScript props interface, no logic):
  ui/           — shadcn auto-generated
  features/
    ActivityCard.tsx        — props: IPost, onFlame, onKudos, onComment
    FlameRating.tsx         — props: average, count, userRating, onRate
    DietHonestyCard.tsx     — props: IDietCard
    TerritoryMap.tsx        — props: territories, onTerritoryClick, userLocation
    LeaderboardRow.tsx      — props: ILeaderboardEntry, isCurrentUser
    GroupRunLiveBoard.tsx   — props: participants, isLive
    StatChip.tsx            — props: icon, label, value, unit
    VerificationBadge.tsx   — props: sourceType
    LocationTagger.tsx      — props: onLocationSelected
    SkeletonCard.tsx        — loading skeleton for ActivityCard
    EmptyState.tsx          — props: icon, headline, subtext, actionLabel, onAction

.env.example (apps/web):
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
  NEXT_PUBLIC_API_URL=http://localhost:5000
  NEXT_PUBLIC_CLERK_ALLOWED_DOMAIN=
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
  NEXT_PUBLIC_FIREBASE_API_KEY=
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
  NEXT_PUBLIC_FIREBASE_APP_ID=
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

━━━ APP 2: apps/api ━━━
Node.js + Express + TypeScript. Applies SOLID throughout.

src/ structure:
  server.ts          — http.createServer(app) + socket.io attach + connectDB() + startCronJobs()
  app.ts             — Express setup: cors, json, rateLimiter, routes, errorHandler
  routes/
    auth.ts          — /api/users/*
    workouts.ts      — /api/workouts/*
    posts.ts         — /api/posts/*
    territories.ts   — /api/territories/*
    leaderboards.ts  — /api/leaderboards/*
    clans.ts         — /api/clans/*
    groupruns.ts     — /api/groupruns/*
    coach.ts         — /api/coach/*
    upload.ts        — /api/upload
    admin.ts         — /admin/* (ADMIN_SECRET middleware)
    webhooks.ts      — /api/webhooks/clerk
  controllers/       — one file per route file, same names
  services/
    territoryService.ts
    scoreService.ts
    geminiService.ts
    notificationService.ts
    locationService.ts
    badgeService.ts
    googleFitService.ts
  repositories/      — (Dependency Inversion) one per model
    userRepository.ts
    postRepository.ts
    territoryRepository.ts
    clanRepository.ts
    workoutRepository.ts
    groupRunRepository.ts
  models/
    User.ts  Workout.ts  Post.ts  Territory.ts
    Attack.ts  Clan.ts  GroupRun.ts  LeaderboardHistory.ts
  middleware/
    requireAuth.ts   — Clerk JWT verification
    rateLimiter.ts   — express-rate-limit factory function
    errorHandler.ts  — global error handler (logs to Sentry)
    adminAuth.ts     — checks ADMIN_SECRET header
  jobs/
    index.ts         — starts all node-cron jobs, logs each registration
    weeklyReset.ts
    dailyStreak.ts
    streakReminder.ts
    challengeExpiry.ts
    groupRunReminder.ts
    territoryRecalc.ts
    scoreSync.ts
  lib/
    mongoose.ts      — connectDB(), mongoose options
    redis.ts         — Upstash Redis client + helpers
    gemini.ts        — initialized GenerativeModel
    cloudinary.ts    — configured v2 client
    firebase.ts      — initialized admin app
    socket.ts        — Socket.io instance (singleton)
  schemas/           — Zod validation schemas, one file per domain
    postSchema.ts  workoutSchema.ts  clanSchema.ts  groupRunSchema.ts

.env.example (apps/api):
  PORT=5000
  MONGODB_URI=
  UPSTASH_REDIS_REST_URL=
  UPSTASH_REDIS_REST_TOKEN=
  CLERK_SECRET_KEY=
  CLERK_WEBHOOK_SECRET=
  GEMINI_API_KEY=
  GOOGLE_MAPS_API_KEY=
  GOOGLE_FIT_CLIENT_ID=
  GOOGLE_FIT_CLIENT_SECRET=
  CLOUDINARY_CLOUD_NAME=
  CLOUDINARY_API_KEY=
  CLOUDINARY_API_SECRET=
  FIREBASE_SERVICE_ACCOUNT_JSON=
  ADMIN_SECRET=
  CLIENT_URL=http://localhost:3000

Show the complete monorepo file tree when done. No logic implemented yet.
```

---

## PROMPT 02 — Authentication + User System

```
Implement complete Clerk authentication and user management for ICHOR.
All UI must use brand colors: #AE93F4 primary, #231F20 background, #FDA2DE accent.
Neighbour font for headings. Inter for body.

━━━ FRONTEND ━━━

apps/web/app/page.tsx — PUBLIC LANDING:
Full viewport dark hero (#231F20).
Center: ICHOR in Neighbour font, 120px, #AE93F4.
Tagline: "Turn Sweat Into Lore" in Inter Light, #FDA2DE, 24px.
Two buttons: "Join ICHOR" → /register, "Sign In" → /login
Subtle animated background: CSS radial gradient pulse in #AE93F4 at 5% opacity.

apps/web/app/(auth)/login/page.tsx:
Split layout: left = brand panel (ICHOR logo, tagline, motivational quote),
right = sign-in card (dark #1A1619, lavender border 1px, border-radius 16px).
Use Clerk's <SignIn> component with appearance prop:
  appearance={{ variables: { colorPrimary: '#AE93F4', colorBackground: '#1A1619',
    colorText: '#FFFFFF', colorInputBackground: '#231F20', colorInputText: '#FFFFFF' },
    elements: { card: 'shadow-none border-0', rootBox: 'w-full' } }}
Below sign-in card: Inter Light text in #FDA2DE "ICHOR is exclusive to athletes."

apps/web/app/(auth)/register/page.tsx:
Same layout as login. Use Clerk's <SignUp> component with same appearance.
Below Clerk component: Inter Light "Campus athletes only. Use your college email."
After Clerk signup fires user.created webhook: POST /api/users/sync is called
automatically from the webhook. Frontend just redirects to /import on first load.

Domain validation (middleware.ts addition):
In the Clerk afterSignUp callback (if NEXT_PUBLIC_CLERK_ALLOWED_DOMAIN is set):
  Check email domain. If mismatch: sign out + redirect to /login?error=domain
  Show toast on /login if error=domain query param: "Only [domain] emails allowed."

apps/web/lib/axios.ts — finalize:
import { auth } from '@clerk/nextjs/server' for server components.
For client components: use useAuth().getToken() in the request interceptor.
Attach as: headers.Authorization = `Bearer ${token}`

hooks/useCurrentUser.ts:
  const { userId } = useAuth()
  useQuery(['user', userId], () => axios.get('/api/users/me'))
  Merge Clerk user data with DB user. Store in Zustand userSlice on success.
  Export: { user: IUser | null, isLoading, isError }

━━━ BACKEND ━━━

REPOSITORY PATTERN — userRepository.ts (Dependency Inversion):
Interface IUserRepository:
  findByClerkId(clerkId: string): Promise<IUser | null>
  upsertByClerkId(clerkId: string, data: Partial<IUser>): Promise<IUser>
  updateStats(userId: string, stats: Partial<IUser['stats']>): Promise<void>
  updateFcmToken(userId: string, token: string): Promise<void>
  findById(userId: string): Promise<IUser | null>
  findPublicProfile(userId: string): Promise<Partial<IUser> | null>

MongoUserRepository implements IUserRepository using Mongoose User model.

All user controller methods receive IUserRepository via constructor injection.

POST /api/webhooks/clerk:
Verify Svix signature using CLERK_WEBHOOK_SECRET. Return 400 on invalid.
On user.created: userRepository.upsertByClerkId(clerkId, { email, name, avatarUrl })
  Initialize stats: all numbers to 0, badges: [], weeklyPlan: []
On user.updated: sync name and avatarUrl only.
Return 200 { received: true }

requireAuth.ts middleware:
  import { ClerkExpressRequireAuth } from '@clerk/express'
  Export: requireAuth = ClerkExpressRequireAuth()
  After Clerk middleware: attach req.userId = req.auth.userId

POST /api/users/sync:
  userRepository.upsertByClerkId(req.userId, body)
  Return full user document.

GET /api/users/me:
  userRepository.findByClerkId(req.userId)
  Return full document (private — own profile).

GET /api/users/:id:
  userRepository.findPublicProfile(userId)
  Include: name, avatarUrl, stats, badges, clanId. Exclude: email, fcmToken.

PATCH /api/users/profile:
  Zod schema: { name?: string, bio?: string, avatarUrl?: string, college?: string }
  userRepository.updateStats(req.userId, validatedBody)

PATCH /api/users/fcm-token:
  Zod: { token: string }
  userRepository.updateFcmToken(req.userId, token)

Rate limits: /api/users/* → 60 req/min per user.
All endpoints wrapped in try/catch → next(error) → global errorHandler.
```

---

## PROMPT 03 — MongoDB Models + All Indexes

```
Implement all Mongoose models for ICHOR with every index needed for
performance at 500–700 concurrent users and geospatial territory queries.
Apply Single Responsibility: each model in its own file. No logic in model files.
Models export the Mongoose model and the TypeScript interface only.

━━━ lib/mongoose.ts ━━━
connectDB():
  mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,         // supports 500–700 users on M0 (max 500 connections, pool:10 per instance)
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  })
  Log: "MongoDB connected: [host]" on success
  Log error and process.exit(1) on failure
  Export connectDB. Call once in server.ts.

━━━ lib/redis.ts ━━━
Use @upstash/redis REST client (not ioredis — REST works without persistent connection).
  import { Redis } from '@upstash/redis'
  export const redis = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN })

Helper functions (export all):
  addScore(key: string, userId: string, score: number): Promise<void>
    — redis.zadd(key, { score, member: userId })
  getLeaderboard(key: string, limit: number): Promise<{member: string, score: number}[]>
    — redis.zrange(key, 0, limit-1, { rev: true, withScores: true })
  getUserRank(key: string, userId: string): Promise<number>
    — redis.zrevrank(key, userId)
  getUserScore(key: string, userId: string): Promise<number>
    — redis.zscore(key, userId)
  deleteKey(key: string): Promise<void>
    — redis.del(key)
  setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void>
    — redis.set(key, value, { ex: ttlSeconds })

━━━ models/User.ts ━━━
Schema fields: all from IUser interface in packages/types.
stats embedded subdocument with all number fields defaulting to 0.
badges: [{ name: String, awardedAt: Date }]
weeklyPlan: [{ day, type, distanceKm, targetCalories, durationMinutes, notes }]

Indexes:
  { clerkId: 1 }                         unique: true
  { 'stats.weeklyScore': -1 }            (weekly leaderboard MongoDB fallback)
  { 'stats.careerScore': -1 }            (global leaderboard)
  { 'stats.streakDays': -1 }             (streak leaderboard)
  { 'stats.integrityPoints': -1 }        (integrity leaderboard)
  { clanId: 1 }                          (clan member queries)

━━━ models/Workout.ts ━━━
Schema fields: all from IWorkout.
verificationStatus: enum ['PENDING', 'VERIFIED', 'FLAGGED'], default: 'PENDING'
sourceType: enum ['HEALTH_SYNC', 'OCR_SCREENSHOT', 'MANUAL', 'GOOGLE_FIT']
activityType: enum ['RUN', 'WALK', 'CYCLE']

Indexes:
  { userId: 1, workoutDate: -1 }
  { externalId: 1, userId: 1 }           unique: true, sparse: true (dedup key)
  { verificationStatus: 1 }              (admin flagged queries)

━━━ models/Post.ts ━━━
Schema fields: all from IPost.
location embedded: { lat, lng, district, city, state, territoryId (ObjectId ref Territory),
  territoryName, territoryRank, method: enum ['GPS','MAP_PICK'] }
engagement embedded: { avgFlameRating:0, flameCount:0, kudosCount:0, flagCount:0 }
dietCard embedded (nullable): all IDietCard fields
weeklyScore: Number, default: 0
territoryScore: Number, default: 0

Indexes:
  { userId: 1, createdAt: -1 }
  { createdAt: -1 }                      (main feed sort)
  { 'location.territoryId': 1, createdAt: -1 }
  { 'location.district': 1, createdAt: -1 }  (district leaderboard)
  { 'location.city': 1, createdAt: -1 }      (city leaderboard)
  { 'engagement.flagCount': -1 }         (admin flagged posts)

━━━ models/Territory.ts ━━━
Schema fields: all from ITerritory.
centroid: { type: { type: String, enum: ['Point'], required: true },
            coordinates: { type: [Number], required: true } }
weeklyLeaderboard: [{ userId: ObjectId ref User, score: Number, rank: Number }]

Indexes:
  { centroid: '2dsphere' }               CRITICAL — enables $near and $geoWithin queries
  { currentOwnerId: 1 }
  { currentClanOwnerId: 1 }
  { createdAt: -1 }

━━━ models/Attack.ts ━━━
Schema fields: all from IAttack.
status: enum ['PENDING','ACCEPTED','FORFEITED','RESOLVED','EXPIRED'], default: 'PENDING'
type: enum ['STAT','SPRINT']

Indexes:
  { defenderId: 1, status: 1 }           (incoming challenges for a user)
  { attackerId: 1, status: 1 }           (outgoing challenges)
  { territoryId: 1, status: 1 }          (territory challenge check)
  { createdAt: 1 }                       (expiry job — sorted by age)

━━━ models/Clan.ts ━━━
Schema fields: all from IClan.
members: [{ userId: ObjectId ref User, role: enum ['LEADER','MEMBER'], joinedAt: Date }]
stats embedded: { weeklyScore: 0, battlesWon: 0, territoriesHeld: 0 }

Indexes:
  { tag: 1 }                             unique: true
  { 'stats.weeklyScore': -1 }            (clan leaderboard)
  { 'members.userId': 1 }               (find user's clan)

━━━ models/GroupRun.ts ━━━
Schema fields: all from IGroupRun.
sessionCode: String, length 6, unique.
status: enum ['LOBBY','ACTIVE','COMPLETED']
type: enum ['COMPETITIVE','FRIENDLY']
participants embedded array: userId, status, checkpoints[], finalStats, reminderSentAt

Indexes:
  { sessionCode: 1 }                     unique: true
  { hostId: 1 }
  { status: 1, startAt: 1 }             (reminder job — upcoming active sessions)

━━━ models/LeaderboardHistory.ts ━━━
Fields: week (String YYYY-WW), category (String), userId (ObjectId), score (Number), rank (Number), createdAt.
Indexes: { week: 1, category: 1 }, { userId: 1, week: -1 }

━━━ src/seed.ts ━━━
Standalone script: npx ts-node src/seed.ts
Creates:
  10 users with varied stats (different streak lengths, scores, colleges)
  5 territories across Delhi with real coordinates:
    Lodhi Garden Loop (28.5935, 77.2229)
    India Gate Grounds (28.6129, 77.2295)
    IIT Delhi Track (28.5459, 77.1927)
    Nehru Park Circuit (28.5969, 77.1987)
    Sanjay Van Trail (28.5878, 77.2215)
  15 posts spread across territories and users with varied scores
  3 clans with members assigned
  5 attacks in various statuses
Log: "[Model]: [count] documents created" for each. connectDB → seed → disconnect.
```

---

## PROMPT 04 — Workout Import Engine + Location System

```
Build the complete workout import system and location tagging.
Implements Interface Segregation: three import strategies share IImportStrategy interface.
All OCR calls are rate-limited at 20 req/min (Gemini cost protection).

━━━ BACKEND ━━━

IImportStrategy interface (services/importStrategies/IImportStrategy.ts):
  parse(input: any): Promise<Partial<IWorkout>>
  — Each strategy (OCR, GoogleFit, Manual) implements this interface.
  — Controller depends on IImportStrategy, not concrete classes.

services/locationService.ts:

reverseGeocode(lat: number, lng: number): Promise<IGeocodeResult>
  Call: https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={GOOGLE_MAPS_API_KEY}
  Extract from address_components:
    district = sublocality_level_1 || sublocality || locality (first match)
    city = locality || administrative_area_level_2
    state = administrative_area_level_1
  Return: { district, city, state, formattedAddress }
  Cache result in Upstash Redis: setWithTTL('geo:{lat},{lng}', JSON.stringify(result), 86400)
  Check cache before calling Google API (saves quota).

findNearbyTerritory(lat: number, lng: number): Promise<ITerritory | null>
  Territory.findOne({
    centroid: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 500 } }
  }).populate('currentOwnerId', 'name avatarUrl')
  Return territory or null.

GET /api/location/detect:
  Query: lat, lng (both required, validate as numbers)
  1. Call reverseGeocode(lat, lng)
  2. Call findNearbyTerritory(lat, lng)
  3. Return { district, city, state, territory: { _id, name, currentOwnerName } | null, method: 'GPS' }

services/importStrategies/OcrStrategy.ts (implements IImportStrategy):
  parse(imageUrl: string):
    Send to geminiService.parseScreenshot(imageUrl)
    Validate result has at least distanceKm and caloriesBurned (not null)
    Return partial IWorkout

services/importStrategies/GoogleFitStrategy.ts (implements IImportStrategy):
  parse(session: GoogleFitSession):
    Map Google Fit session fields to IWorkout shape
    externalId = session.id
    Return partial IWorkout

services/importStrategies/ManualStrategy.ts (implements IImportStrategy):
  parse(body: ManualWorkoutInput):
    Validate required fields, return IWorkout shape directly

POST /api/workouts/ocr:
  rateLimiter(20 per minute per user) — higher restriction than default
  Middleware: multer (memory storage, max 10MB, mime: image/*)
  1. Upload buffer to Cloudinary: cloudinary.uploader.upload_stream()
  2. Get secure_url
  3. const strategy = new OcrStrategy(geminiService)
  4. const extracted = await strategy.parse(secure_url)
  5. If extracted.error: return 422 { error: 'Could not extract workout data. Please enter manually.' }
  6. Save Workout (sourceType: 'OCR_SCREENSHOT', verificationStatus: 'PENDING', screenshotUrl)
  7. Return { workoutId, extracted, screenshotUrl }

POST /api/workouts/sync/googlefit:
  Requires valid googleFitRefreshToken in user document.
  1. googleFitService.refreshToken(user.connectedApps.googleFitRefreshToken)
  2. Fetch sessions from: https://www.googleapis.com/fitness/v1/users/me/sessions
     params: startTime, endTime (last 7 days), activityType=7 (running), 8 (walking), 1 (cycling)
  3. For each session: check if externalId exists (workoutRepository.findByExternalId)
  4. New only: create via GoogleFitStrategy, save (sourceType: 'GOOGLE_FIT', verificationStatus: 'VERIFIED')
  5. Return { created: number, alreadyExists: number }

POST /api/workouts/sync/manual:
  Zod schema: all workout fields, all required.
  sourceType: 'MANUAL', verificationStatus: 'PENDING'
  Save and return workoutId.

GET /api/workouts/mine:
  cursor-based pagination (cursor = last _id)
  workoutRepository.findByUser(req.userId, cursor, limit: 20)
  Return { workouts, nextCursor }

━━━ FRONTEND ━━━

apps/web/app/(app)/import/page.tsx:

Page header: "Import Your Run" in Neighbour font, #AE93F4.
Three tabs (shadcn Tabs component, lavender active indicator):

TAB 1 — Screenshot:
  Drag-and-drop zone: dashed #AE93F4 border, #1A1619 fill, 200px height.
  Icon: upload SVG in #AE93F4.
  Text: "Drop your Strava, RunKeeper, or Garmin screenshot" in Inter Light.
  On file drop/click: show preview thumbnail + progress bar.
  POST to /api/workouts/ocr (FormData).
  Loading state: spinner with "Vikas Yadav is reading your workout..." in Inter Light #FDA2DE.
  On success: show editable form (fields from extracted, all editable):
    Activity Type (Select), Distance (km), Duration (h:mm:ss), Avg Pace, Calories, Date.
  Screenshot thumbnail shown below form: "📷 Saved as proof."
  Button: "Looks Good — Write My Post →" → navigates to /import/compose?workoutId={id}

TAB 2 — Google Fit:
  If not connected: "Connect Google Fit" button → OAuth flow (GET /api/auth/googlefit)
  If connected: list of last 7 days workouts as cards.
    Each card: date, activity type icon, distance, duration, calories.
    Button: "Add to ICHOR" → POST /api/workouts/sync/googlefit with activityId
    → navigate to /import/compose?workoutId={id}
  "Sync Now" button to refresh list.

TAB 3 — Manual:
  Full form: all fields. Submit → POST /api/workouts/sync/manual → navigate to compose.

LocationTagger component (components/features/LocationTagger.tsx):
  Props: onLocationSelected(location: IPostLocation): void
  On mount: navigator.geolocation.getCurrentPosition(success, error, { timeout: 10000, maximumAge: 0 })
  
  SUCCESS path:
    Show: animated pulse dot + "📍 Detecting your run location..."
    GET /api/location/detect?lat={}&lng={}
    On response:
      If territory found: green chip "✓ [Territory Name]" + "Not your run area? Change ↓"
      If no territory: yellow chip "🆕 First here! Name this territory." + text input for name
    Calls onLocationSelected with full IPostLocation result.

  FAILURE path:
    Show: amber chip "📍 Location unavailable — pick on map"
    Load Google Maps JS embed (@googlemaps/js-api-loader, dark map style)
    Map height: 280px, rounded-xl
    "Click the map where you ran" instruction
    On map click: get lat/lng → GET /api/location/detect → same success flow

  Both paths: show district + city as subtext below chip: "South Delhi, New Delhi"
```

---

## PROMPT 05 — Post Composer + Social Feed

```
Build the post creation system and social activity feed.
Open/Closed principle: feed filters are a config array, not a switch statement.
No N+1 queries: feed uses a single aggregation pipeline with $lookup.

━━━ BACKEND ━━━

POST /api/posts:
Zod schema: { workoutId, photoUrls: string[] (min 1, max 5), caption?: string,
  location: { lat, lng, district, city, state, territoryId?: string,
              newTerritoryName?: string, method: 'GPS'|'MAP_PICK' },
  isPublic?: boolean, dietCard?: { description, classification,
  estimatedCaloriesIn, integrityBonus, tip } }

Controller calls postService.createPost(userId, dto):
  1. Fetch workout (workoutRepository.findById — must belong to req.userId)
  2. If no workoutId match: 403 Forbidden
  3. Compute weeklyScore: import { calculateWeeklyScore } from '@ichor/utils'
     Fetch this week's posts for user, add this new one, compute score
  4. Compute territoryScore similarly via calculateTerritoryScore
  5. If location.newTerritoryName: create Territory (validate no existing within 500m first)
     Else if location.territoryId: verify territory exists
  6. Save Post document with all fields including computed scores
  7. Mark workout.verificationStatus = 'VERIFIED'
  8. User stats update (bulkWrite for atomicity):
     totalWorkouts++, totalCalories += caloriesBurned, totalDistanceKm += distanceKm
     integrityPoints += dietCard.integrityBonus (if diet card present)
  9. Upstash Redis — addScore to all relevant sorted sets:
     lb:weekly:{weekKey()}                — weeklyScore
     lb:district:{districtSlug}:{weekKey()} — weeklyScore
     lb:city:{citySlug}:{weekKey()}       — weeklyScore
     lb:calories:{weekKey()}              — caloriesBurned (raw)
     lb:distance:{weekKey()}              — distanceKm
  10. Emit Socket.io to 'feed' room: 'feed:new_post' with minimal post preview
  11. setImmediate: territoryService.claimOrUpdate(userId, territoryId, territoryScore)
  Return: { postId, weeklyScore, territoryRank }

GET /api/feed:
  Query: cursor (last post _id), filter (all|following|clan|territory|top), limit: 20
  
  Single aggregation pipeline (no N+1):
  Pipeline stages:
    $match: build match from filter (see below)
    $sort: { createdAt: -1 } (or { engagement: -1 } for top filter)
    $limit: 21 (fetch one extra to determine nextCursor)
    $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'author',
               pipeline: [{ $project: { name:1, avatarUrl:1, clanId:1 } }] }
    $lookup: { from: 'workouts', localField: 'workoutId', foreignField: '_id', as: 'workout' }
    $lookup: { from: 'territories', localField: 'location.territoryId', foreignField: '_id',
               as: 'territory', pipeline: [{ $project: { name:1 } }] }
    $addFields: { author: { $arrayElemAt: ['$author', 0] },
                  workout: { $arrayElemAt: ['$workout', 0] },
                  territory: { $arrayElemAt: ['$territory', 0] } }
  
  Filter configs (Open/Closed — add new filters by adding to config, not modifying pipeline):
    all:       { isPublic: true }
    following: { userId: { $in: user.following } }  (add following[] to User model)
    clan:      { userId: { $in: clanMemberIds } }
    territory: { 'location.territoryId': { $in: user.territoryIds } }
    top:       { createdAt: { $gte: 24hoursAgo }, isPublic: true } + sort by engagement sum
  
  Cursor: if cursor provided, add $match { _id: { $lt: ObjectId(cursor) } }
  Return: { posts: first 20, nextCursor: 21st post _id or null }

POST /api/posts/:id/flame:
  Zod: { rating: z.number().int().min(1).max(5) }
  Find or create FlameRating embedded in post (use $addToSet or separate tracking).
  Better approach: track in Redis for speed. Key: 'flame:{postId}:{userId}' → value: rating
  Aggregate avg: compute from all ratings. Update post.engagement.avgFlameRating + flameCount.
  Return { newAvg, userRating }

POST /api/posts/:id/kudos: toggle. redis.get('kudos:{postId}:{userId}') → set/delete. Update post.engagement.kudosCount.

POST /api/posts/:id/flag: $inc flagCount. If >= 3: update workout.verificationStatus 'FLAGGED'. Emit 'admin:flagged' Socket.io event.

GET /api/posts/:id/comments: Post.findById with comments population. Flat list with parentId for UI to nest.
POST /api/posts/:id/comments: Append to comments array (embed comments in Post, max depth 1).

POST /api/coach/diet-analyze:
  Zod: { description: string, caloriesBurned: number }
  Call geminiService.analyzeDiet(description, caloriesBurned)
  Return parsed IDietCard shape.

POST /api/upload:
  Generate Cloudinary signed upload params server-side:
    const timestamp = Math.round(Date.now() / 1000)
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder: 'ichor' }, API_SECRET)
    Return { signature, timestamp, cloudName, apiKey, folder }
  Frontend uploads directly to Cloudinary — backend never handles binary data.

━━━ FRONTEND ━━━

apps/web/app/(app)/import/compose/page.tsx:
Reads workoutId from searchParams. On mount: GET /api/workouts/{workoutId}

Sections (dark cards, lavender section borders):

1. WORKOUT PREVIEW (top, non-editable):
   Dark card #1A1619, 1px #AE93F4 left border.
   4-column stat strip using StatChip: Distance | Pace | Duration | Calories.
   VerificationBadge showing sourceType.

2. PHOTOS (required):
   "Add Photos (required — min 1)" label in Inter Light #FDA2DE.
   Upload: POST /api/upload → get signed params → upload directly to Cloudinary.
   Show photo grid with X remove. Lavender add button.

3. CAPTION:
   Textarea with #231F20 bg, #AE93F4 border on focus. 300 char counter.

4. LOCATION (LocationTagger component):
   Shows detected territory or map picker.

5. DIET HONESTY CARD (collapsible — open by default with pulsing "Try this!" indicator on first visit):
   Header: "🍽 Fuel Log — earn Integrity Points"
   Textarea: "What did you eat today? Describe honestly."
   "Analyze with Vikas Yadav" button → POST /api/coach/diet-analyze (loading: "Vikas Yadav is thinking...")
   On result: show DietHonestyCard component with classification, calorie balance bar, tip.
   User can "Use this" (attaches to post) or "Skip".

6. VISIBILITY: Toggle (Public / Clan Only / Private) with Inter Light description.

7. POST BUTTON: Full-width, rounded-full, #AE93F4, "Post to ICHOR" in Neighbour font.

apps/web/app/(app)/feed/page.tsx:
  useInfiniteQuery against GET /api/feed?filter={active} with getNextPageParam from nextCursor.
  Filter tabs (shadcn Tabs): All | Following | Clan | My Territory | Top Today.
  Pull to refresh via refetchOnWindowFocus or manual button.
  Socket.io: subscribe to 'feed' room on mount. On 'feed:new_post': show "▲ New posts" pill at top.

ActivityCard (components/features/ActivityCard.tsx):
  Dark card #1A1619, rounded-2xl, subtle box-shadow with #AE93F4 at 10%.
  On hover: border-color transitions to #AE93F4 (CSS transition 200ms).
  
  Layout (vertical stack, gap-3):
  - Header: Avatar (40px, rounded-full) | Name (Inter 700) | timeAgo (Inter 300, #6B6570) | ActivityBadge | VerificationBadge
  - Hero photo: next/image, aspect-ratio 16/9, rounded-xl, object-cover. Swipe gesture for multiple photos.
  - StatChip row: 4 chips, each: icon (20px SVG) + value (Inter 700) + unit (Inter 300 #6B6570)
  - DietHonestyCard (if dietCard !== null): always shown, never hidden
  - Territory chip: "📍 [name] — #[rank] this week" pill, #AE93F4 background at 15%, #AE93F4 text
  - Caption: 3 lines max, "See more" expand link in #AE93F4
  - OCR proof: if sourceType OCR: small "📷 Verified Screenshot" thumbnail, click → modal
  - Footer: FlameRating | [count] Comments | Kudos button | Share

DietHonestyCard (components/features/DietHonestyCard.tsx):
  Small card below stats, #231F20 background, 1px border in classification color.
  Left: badge pill (CLEAN=green, CHEAT=#FDA2DE, NEUTRAL=gray) + emoji + label.
  Center: calorie balance bar — left side pink (in), right side lavender (out), center = balance line.
  Text: "−320 kcal deficit 🔥" (green) or "+180 kcal surplus 🧁" (amber).
  Right: Vikas Yadav's tip in Inter Light italic, 12px.
```

---

## PROMPT 06 — Territory System + Map

```
Build the territory map, ownership system, and attack/challenge flow.
Territory uses MongoDB 2dsphere — no predefined zones. Users create territories organically.
Dependency Inversion: all territory DB operations go through ITerritoryRepository interface.

━━━ BACKEND ━━━

ITerritoryRepository interface:
  findNearby(lat, lng, maxDistance: 500): Promise<ITerritory[]>
  findById(id: string): Promise<ITerritory | null>
  create(data): Promise<ITerritory>
  updateLeaderboard(territoryId, userId, score): Promise<void>
    — upsert { userId, score } in weeklyLeaderboard array
    — re-sort array by score desc, assign ranks 1..n
    — update currentOwnerId if rank 1 changed
  transferOwner(territoryId, newOwnerId): Promise<void>
  findAll(limit: 200): Promise<ITerritory[]>

services/territoryService.ts:

claimOrUpdate(userId: string, territoryId: string, territoryScore: number):
  1. repo.updateLeaderboard(territoryId, userId, territoryScore)
  2. Fetch updated territory
  3. If currentOwnerId changed (new rank 1):
     - notificationService.sendPush(oldOwnerId, { title: '💥 Territory Lost!', ... })
     - notificationService.sendPush(newOwnerId, { title: '🏆 Territory Claimed!', ... })
  4. Check if top 3 in weeklyLeaderboard are all same clan → set currentClanOwnerId
  5. Emit Socket.io to 'territory:{id}' room: 'territory:updated' with new owner info

shouldTriggerAttack(userId, territoryId): Promise<boolean>
  — Returns true if userId is NOT in top 3 and has posted in territory this week
  — Used to show "Challenge" button on frontend

createAttack(attackerId, defenderId, territoryId, type):
  1. Check no PENDING attack exists for this territory
  2. Check attacker has posted in territory this week (postRepository.hasUserPostedInTerritory)
  3. Create Attack document
  4. notificationService.sendPush(defenderId, TERRITORY_CHALLENGED notification)
  5. Return attack

GET /api/territories/nearby:
  Query: lat, lng, radius (default 5000m, max 20000m)
  territoryRepository.findNearby(lat, lng, radius)
  Populate currentOwnerId (name, avatarUrl), currentClanOwnerId (color, tag)
  Return array with GeoJSON centroid (for Google Maps circle rendering)

GET /api/territories/:id:
  Full territory document + populated weeklyLeaderboard (name, avatarUrl per userId, limit 10)
  Recent posts in this territory: last 20 posts where location.territoryId = id
  Recent attacks: last 10 attacks where territoryId = id

POST /api/territories:
  Called from post compose flow if newTerritoryName provided.
  Validate: name 3–50 chars.
  Check: no existing territory within 500m (findNearby with maxDistance 500).
  If exists: return 409 { error: 'Territory already exists here', existing: { id, name } }
  Create: { name, createdBy: userId, centroid: { type:'Point', coordinates:[lng,lat] }, radiusMeters:500 }
  Return new territory.

POST /api/attacks:
  Zod: { territoryId, type: 'STAT'|'SPRINT', scheduledAt?: string }
  Get territory → get currentOwnerId (= defenderId)
  If defenderId === attackerId: 400 'Cannot challenge your own territory'
  Call territoryService.createAttack(...)
  Return attack.

POST /api/attacks/:id/respond:
  Zod: { action: 'ACCEPT'|'FORFEIT' }
  Must be req.userId === attack.defenderId (else 403)
  ACCEPT: attack.status = 'ACCEPTED' + FCM to attacker
  FORFEIT: attack.status = 'FORFEITED'
    → call territoryService.claimOrUpdate(attackerId, territoryId, attackerScore)
    → FCM to both

POST /api/attacks/:id/resolve:
  Zod: { winnerId }
  Must be admin OR both parties. For MVP: only admin.
  Update territory ownership, battlesWon/Lost on both users, status RESOLVED, FCM both.

GET /api/attacks/incoming: attacks where defenderId = req.userId, status PENDING.
GET /api/attacks/outgoing: attacks where attackerId = req.userId.

━━━ FRONTEND ━━━

apps/web/app/(app)/map/page.tsx:

Load Google Maps JS API (@googlemaps/js-api-loader).
Dark map style JSON (mapId or custom styles array that matches #231F20 theme).
On mount: navigator.geolocation.getCurrentPosition (one-time ping, not tracked).
  On success: center map on user coords + fetch GET /api/territories/nearby?lat=&lng=&radius=10000
  On fail: center on default (India Gate: 28.6129, 77.2295) + fetch all territories

Render territories as google.maps.Circle:
  center: territory.centroid.coordinates [lng, lat] (note: GeoJSON is [lng,lat])
  radius: 500 (meters)
  fillColor: clanColor || '#AE93F4'
  fillOpacity: 0.25
  strokeColor: same color
  strokeOpacity: 0.8
  strokeWeight: 2

Current user's territories: strokeWeight 4, add CSS animation class for lavender glow pulse.
Unclaimed territories (no currentOwnerId): fillColor '#6B6570', strokeColor '#6B6570'.

Click circle → open right panel (slide-in, 320px, dark #1A1619):
  Territory name in Neighbour font.
  Owner row: avatar + name + weeklyScore on this territory.
  "Territory Leaderboard" section: top 5 entries (rank, avatar, name, score).
  My rank: highlighted row if user is in leaderboard.
  
  Buttons:
    If user is current owner: "🛡 Defend" → shows incoming attacks list
    If user is NOT owner: "⚔️ Challenge" → opens ChallengeSheet
    Always: "View Full Leaderboard" → /territory/{id}

ChallengeSheet (shadcn Sheet component from bottom):
  Shows: "Your weekly score here: [X]" vs "Owner's score: [Y]"
  Radio: STAT Battle / Sprint Duel
  If Sprint: date/time picker (shadcn DatePicker)
  Submit → POST /api/attacks → show success toast

"Find My Area" button (top-right map control):
  GPS ping → re-center map → refetch nearby territories
  Toast: "Showing territories in [District], [City]"

Incoming attacks banner (if GET /api/attacks/incoming returns count > 0):
  Sticky banner below header: red #FDA2DE background.
  "[N] challenge(s) pending! Respond within 48 hours." → click opens attack list modal.

Socket.io: join 'territory:{id}' rooms for user's territories on mount.
  On 'territory:updated': refetch territory data, animate circle color change.
```

---

## PROMPT 07 — Leaderboards + Scoring Engine

```
Build all 11 leaderboard categories, the complete scoring engine, and all node-cron jobs.
Strategy pattern for scoring. All leaderboards served from Upstash Redis.
Cursor-based pagination on all list endpoints.

━━━ BACKEND ━━━

services/scoreService.ts — Strategy Pattern:

interface IScoringStrategy {
  calculate(params: ScoringParams): number
}

class PaceStrategy implements IScoringStrategy:
  calculate({ avgPaceMinPerKm }):
    if pace < 5: return 1.3
    if pace <= 6: return 1.15
    if pace <= 7: return 1.0
    return 0.9

class ConsistencyStrategy implements IScoringStrategy:
  calculate({ activeDays }):
    return Math.min(1.0 + (activeDays - 1) * 0.1, 2.0)

class IntegrityStrategy implements IScoringStrategy:
  calculate({ cleanLogs, cheatLogs, baseCalories }):
    return (cleanLogs * 50) - (cheatLogs * baseCalories * 0.10)

class ScoreService:
  constructor(private pace: PaceStrategy, private consistency: ConsistencyStrategy, private integrity: IntegrityStrategy)
  
  async calculateAndStoreWeeklyScore(userId: string, week: string):
    1. Fetch all posts for userId in current week (workoutDate in Mon–Sun range)
    2. baseCalories = sum caloriesBurned
    3. activeDays = count distinct workoutDates
    4. avgPace = weighted avg of avgPaceMinPerKm
    5. cleanLogs = count posts with dietCard.classification CLEAN
    6. cheatLogs = count posts with dietCard.classification CHEAT
    7. paceMultiplier = this.pace.calculate({ avgPaceMinPerKm: avgPace })
    8. consistencyMult = this.consistency.calculate({ activeDays })
    9. integrityMod = this.integrity.calculate({ cleanLogs, cheatLogs, baseCalories })
    10. weeklyScore = (baseCalories × consistencyMult × paceMultiplier) + integrityMod
    11. User.findByIdAndUpdate(userId, { 'stats.weeklyScore': weeklyScore })
    12. Return weeklyScore
  
  async updateRedisBoards(userId, weeklyScore, caloriesBurned, distanceKm, district, city, week):
    Batch all addScore calls. Redis is fast — these are independent, run with Promise.all.

GET /api/leaderboards/:category:
  Params: category (weekly|district|city|calories|distance|pace|streak|integrity|global|clans|territory)
  Query: lat, lng (for district/city only), week (default current), territoryId (for territory only), cursor

  Controller: LeaderboardController maps category → LeaderboardStrategy (Open/Closed):

  interface ILeaderboardStrategy {
    getEntries(params): Promise<ILeaderboardEntry[]>
  }

  RedisLeaderboardStrategy (weekly, district, city, calories, distance):
    1. Check Redis: getLeaderboard(key, 50)
    2. If Redis miss (empty set): fallback to MongoDB aggregation, populate Redis
    3. Batch fetch User documents by userId array (findByIds, single query)
    4. Merge with Redis scores → ILeaderboardEntry[]
    5. Add delta: compare with LeaderboardHistory for previous week

  MongoLeaderboardStrategy (streak, integrity, global):
    User.find().sort(field).limit(50).select('name avatarUrl stats clanId')

  ClanLeaderboardStrategy:
    Clan.find().sort('stats.weeklyScore').limit(20).populate(member count)

  TerritoryLeaderboardStrategy:
    Territory.findById(territoryId).select('weeklyLeaderboard').populate(...)

  "Find My Area" (district/city boards): GET /api/leaderboards/local?lat=&lng=&type=district|city
    reverseGeocode → get district/city slug → fetch from Redis

━━━ NODE-CRON JOBS ━━━

jobs/index.ts — Register all jobs. Log each with: console.log('[CRON] {name} registered: {schedule}')

jobs/weeklyReset.ts — cron: '0 0 * * 1', timezone: 'Asia/Kolkata' (Monday 00:00 IST):
  try {
    console.log('[CRON] Weekly reset starting...')
    const week = weekKey()  // current (about to be reset) week
    
    1. Save LeaderboardHistory — top 3 per category from Redis before clearing:
       For each category: getLeaderboard(key, 3) → save to LeaderboardHistory
    
    2. Award weekly badges via badgeService.awardWeeklyBadges(week):
       Fetch rank 1 of each category → check badge not already given this week → award
    
    3. Clear Redis keys:
       Keys to delete: lb:weekly, lb:calories, lb:distance + all district/city keys
       Use redis.keys('lb:*:{week}') → bulk delete
    
    4. Reset Territory.weeklyLeaderboard[].score = 0 for all territories:
       Territory.updateMany({}, { $set: { 'weeklyLeaderboard.$[].score': 0 } })
    
    5. Reset User.stats.weeklyScore = 0 for all users:
       User.updateMany({}, { $set: { 'stats.weeklyScore': 0 } })
    
    6. Resolve pending Clan Wars (compare top 3 members each clan → winner takes 1 territory)
    
    console.log('[CRON] Weekly reset complete. Users affected: [count]')
  } catch (err) { Sentry.captureException(err); console.error('[CRON] Weekly reset FAILED', err) }

jobs/dailyStreak.ts — cron: '59 23 * * *', timezone: 'Asia/Kolkata' (23:59 IST daily):
  1. Find all users with at least one post ever (totalWorkouts > 0)
  2. For each: check if Post exists with workoutDate = today (date range 00:00–23:59 IST today)
  3. Build bulkWrite array:
     has post today: { updateOne: { filter: {_id}, update: { $inc: {'stats.streakDays': 1} },
       also: { $max: {'stats.longestStreak': currentStreak+1} } } }
     no post today:  { updateOne: { filter: {_id}, update: { $set: {'stats.streakDays': 0} } } }
  4. User.bulkWrite(operations)  — single DB round trip
  console.log('[CRON] Streak check: [postedCount] posted, [missedCount] streak reset')

jobs/streakReminder.ts — cron: '0 20 * * *', timezone: 'Asia/Kolkata' (20:00 IST daily):
  Find users: streakDays >= 3 AND no post today
  For each: notificationService.sendPush(userId, STREAK_REMINDER notification)
  Cap: max 200 push notifications per run (free FCM tier)

jobs/challengeExpiry.ts — cron: '0 * * * *' (every hour):
  Attack.find({ status: 'PENDING', createdAt: { $lt: 48hoursAgo } })
  For each: set EXPIRED, FCM to both attacker (they fail) and defender (they keep territory)

jobs/groupRunReminder.ts — cron: '*/5 * * * *' (every 5 minutes):
  GroupRun.find({ status: 'LOBBY', startAt: { $gte: now, $lte: now+16min },
    reminderSentAt: null })
  For each participant: sendPush GROUP_RUN_STARTING. Set reminderSentAt.

jobs/territoryRecalc.ts — cron: '0 2 * * *' (daily 02:00 IST):
  For each territory: sort weeklyLeaderboard by score desc, re-assign ranks 1..n
  If currentOwnerId changed: FCM to both old and new owner
  (Catches any edge cases where real-time update was missed)

jobs/scoreSync.ts — cron: '0 */6 * * *' (every 6 hours):
  For top 100 active users (sorted by weeklyScore): recalculate and push to Redis
  Keeps leaderboards accurate between manual recomputes

━━━ FRONTEND ━━━

apps/web/app/(app)/leaderboard/page.tsx:

Tab navigator (11 tabs, horizontally scrollable, Neighbour font labels):
Global | Weekly | District | City | Calories | Pace | Distance | Streak | Integrity | Territories | Clans

"📍 Find My Area" button (top right): GPS ping → auto-activates District and City tabs.
If GPS denied: show "Enter your city" search input instead.

Each tab: GET /api/leaderboards/{category} with appropriate params.

LeaderboardRow (components/features/LeaderboardRow.tsx):
  Rank display:
    1st: gold gradient text #D4AF37, crown emoji, larger size
    2nd: silver #C0C0C0
    3rd: bronze #CD7F32
    rest: plain white Inter 300
  Layout: rank | avatar (32px) | name + clan tag badge | score + unit | delta arrow
  "YOU" badge: #AE93F4 pill if userId matches current user
  Delta: ↑3 (green) / ↓2 (#FDA2DE) / — (#6B6570) vs LeaderboardHistory previous week
  
  Clicking a row: navigate to /profile/{userId}

Territory tab: dropdown to select from user's territories. Shows that territory's weeklyLeaderboard.

Hall of Fame (bottom of leaderboard page):
  Section: "Last Week's Champions"
  Fetch LeaderboardHistory for previous week. Show top 1 per category as cards.
```

---

## PROMPT 08 — Group Runs + Real-time + Clan System

```
Build group runs with Socket.io live leaderboard, and the complete clan system.
Socket.io rooms scoped tightly — never broadcast to all 700 users.
All clan DB operations via IClanRepository (Dependency Inversion).

━━━ BACKEND — SOCKET.IO SETUP ━━━

lib/socket.ts:
  export let io: Server
  export function initSocket(httpServer):
    io = new Server(httpServer, { cors: { origin: CLIENT_URL, credentials: true } })
    
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token
      verify token with Clerk SDK → attach socket.data.userId
      if invalid: next(new Error('Unauthorized'))
    })
    
    io.on('connection', (socket) => {
      socket.join('feed')  // all users join feed room for new post notifications
      
      socket.on('join:territory', (territoryId) => socket.join('territory:' + territoryId))
      socket.on('leave:territory', (territoryId) => socket.leave('territory:' + territoryId))
      
      socket.on('join:grouprun', (groupRunId) => socket.join('grouprun:' + groupRunId))
      socket.on('leave:grouprun', (groupRunId) => socket.leave('grouprun:' + groupRunId))
      
      socket.on('join:clan', (clanId) => socket.join('clan:' + clanId))
      
      socket.on('clan:chat', (data) => {
        // ephemeral chat — not persisted, just broadcast to room
        io.to('clan:' + data.clanId).emit('clan:chat', {
          userId: socket.data.userId, message: data.message, ts: new Date()
        })
      })
      
      socket.on('disconnect', () => { /* cleanup if needed */ })
    })

━━━ BACKEND — GROUP RUNS ━━━

POST /api/groupruns:
  Zod: { title, type: COMPETITIVE|FRIENDLY, location: { lat,lng,district,city }, startAt, maxParticipants: 2–20 }
  Generate sessionCode: crypto.randomBytes(3).toString('hex').toUpperCase() (6 chars)
  Check unique (retry if collision).
  Create GroupRun. Creator is first participant (status: READY as host).
  Return { id, sessionCode }

GET /api/groupruns/join/:code:
  Find by sessionCode (case-insensitive). Return { id, title, hostId, status, participantCount }

POST /api/groupruns/:id/join:
  Check: status LOBBY, participant count < maxParticipants, not already joined.
  Push participant { userId, status: 'READY', checkpoints: [] }
  Emit to 'grouprun:{id}': 'grouprun:participant_joined' with participant info
  Return updated participant list.

POST /api/groupruns/:id/ready:
  Toggle participant status READY ↔ NOT_READY.
  Emit 'grouprun:ready_update' to room.

POST /api/groupruns/:id/start (host only):
  Check: all participants READY or within 5 min of startAt.
  Set status ACTIVE, record actualStartTime.
  Emit 'grouprun:started' to room → frontend navigates to /grouprun/{id}/live

POST /api/groupruns/:id/sync (Google Fit live update):
  Body: { userId, distanceKm, avgPaceMinPerKm, caloriesBurned, source: 'GOOGLE_FIT'|'MANUAL' }
  Update participant's latest stats (upsert last checkpoint: { distanceKm, timestamp: now })
  Recompute live rankings: sort participants by distanceKm desc.
  Emit to 'grouprun:{id}': 'participant:update' with all participants' current stats + ranks.

POST /api/groupruns/:id/checkpoint (manual fallback):
  Body: { userId, distanceKm }
  Append to participant.checkpoints. Then same emit as /sync.

POST /api/groupruns/:id/finish:
  Body: { userId, finalStats: { distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned } }
  Set participant status FINISHED, save finalStats.
  Check if all participants FINISHED → if yes, call groupRunService.resolveRun(id)

POST /api/groupruns/:id/end (host only or auto after 2hr timeout):
  Call groupRunService.resolveRun(id) regardless of who finished.

groupRunService.resolveRun(groupRunId):
  1. Sort participants by distanceKm desc (or durationSeconds asc if same distance)
  2. Emit 'grouprun:final' to room with final leaderboard
  3. Set status COMPLETED
  4. COMPETITIVE: winner gets territory claim for group run location
     → territoryService.claimOrUpdate(winnerId, territoryId, winnerScore)
  5. FRIENDLY: all get 'Co-Runner' badge via badgeService
  6. FCM to all participants with final rank

━━━ BACKEND — CLAN SYSTEM ━━━

IClanRepository interface:
  create(data): Promise<IClan>
  findById(id): Promise<IClan | null>
  search(query: string): Promise<IClan[]>
  findByMember(userId): Promise<IClan | null>
  addMember(clanId, userId): Promise<void>
  removeMember(clanId, userId): Promise<void>
  updateLeaderStats(clanId, stats): Promise<void>
  findTopClans(limit: 20): Promise<IClan[]>

POST /api/clans: Zod validate. Check tag unique. Create. Add creator as LEADER member.
GET /api/clans: Top 20 by stats.weeklyScore. Include member count, territoriesHeld.
GET /api/clans/search?q=: Regex search on name and tag.
GET /api/clans/:id: Full clan. Populate member user details (name, avatarUrl, stats.weeklyScore).
  Include territory list (Territory.find({ currentClanOwnerId: clanId }))
  Include active attacks involving any member.
POST /api/clans/:id/join:
  Check not in a clan already (else 409 with option to leave current).
  Check member count < 15.
  clanRepository.addMember. Update User.clanId.
POST /api/clans/:id/leave:
  If leader: find oldest member by joinedAt → promote to LEADER.
  If last member: delete clan.
  clanRepository.removeMember. Clear User.clanId.
DELETE /api/clans/:id/members/:userId: Leader only (check req.userId = clan.leaderId). Cannot kick self.
PATCH /api/clans/:id: Leader only. Zod: { name?, tag?, color?, dietPactDescription? }

━━━ FRONTEND ━━━

GroupRun Lobby (app/(app)/grouprun/[id]/page.tsx):
  Participant list with real-time updates via Socket.io 'grouprun:{id}' room.
  Countdown timer component (mm:ss to startAt).
  Ready toggle (green when ready). Clan chat panel (right side on desktop, tab on mobile).
  "Start Run" button: visible only to host, enabled when all ready.

Live Run (app/(app)/grouprun/[id]/live/page.tsx):
  Setup on mount:
    1. Connect Google Fit if available (check user.connectedApps.googleFitRefreshToken)
    2. If Fit available: setInterval(60000, pollGoogleFit) → POST /api/groupruns/:id/sync
    3. If Fit unavailable: show checkpoint buttons (1km 2km 3km 4km 5km+)
    4. Join Socket.io room 'grouprun:{id}'
  
  On 'participant:update' event: update GroupRunLiveBoard component via Zustand slice.
  
  GroupRunLiveBoard: animated list, CSS transitions for rank changes.
    Each row: rank (animated number), avatar, name, current distance, pace, calories.
    Current user highlighted in #AE93F4.
  
  "Finish" button: confirm dialog → POST /api/groupruns/:id/finish with final stats.
    If Google Fit: use final synced stats. If manual: show stat entry form.

Clan pages: standard CRUD UI following brand design system.
Clan chat: Socket.io ephemeral messages, rendered as simple bubble chat, not persisted.
```

---

## PROMPT 09 — Gemini AI Features

```
Implement all four Gemini AI features: screenshot OCR, diet analyzer, AI coach Vikas Yadav, training plan.
Rate-limit all /api/coach/* at 10 req/min per user (free tier: 15 RPM total, protect quota).
All Gemini prompts are final-quality — no placeholders.

━━━ GEMINI SERVICE ━━━

lib/gemini.ts:
  import { GoogleGenerativeAI } from '@google/generative-ai'
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  export const geminiFlash = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
  })

services/geminiService.ts:
  All four methods. Handle: strip markdown fences before JSON.parse.
  If JSON.parse fails after strip: try regex /\{[\s\S]*\}/ to extract JSON block.
  If still fails: throw GeminiParseError with original response logged.

Method 1 — parseScreenshot(imageUrl: string): Promise<Partial<IWorkout>>

  Fetch image from Cloudinary URL as base64 (axios.get with responseType: 'arraybuffer')
  Send to Gemini with inlineData (base64) OR use the URL directly if Gemini supports fetch.
  
  Exact system prompt (use verbatim):
  "You are a precise fitness data extraction engine. Analyze this screenshot from a fitness
  tracking application (may be Strava, RunKeeper, Garmin Connect, Nike Run Club, Apple Fitness,
  Samsung Health, or similar). Extract the workout metrics shown. Return ONLY a raw JSON object
  with absolutely no markdown formatting, no code fences, no explanation, no text before or after
  the JSON. Use this exact schema:
  { activityType: 'RUN'|'WALK'|'CYCLE', distanceKm: number, durationSeconds: number,
    avgPaceMinPerKm: number|null, caloriesBurned: number, heartRateAvg: number|null,
    workoutDate: 'YYYY-MM-DD' }
  If a field is not clearly visible, use null. Do not estimate. Do not fabricate any value."

Method 2 — analyzeDiet(description: string, caloriesBurned: number): Promise<IDietCard>

  Exact system prompt (use verbatim):
  "You are a sports nutritionist AI for ICHOR, a competitive fitness app for college athletes.
  The user describes their food intake for today. Analyze it in the context of athletic
  performance and recovery. Return ONLY a raw JSON object with no markdown:
  { classification: 'CLEAN'|'CHEAT'|'NEUTRAL', estimatedCaloriesIn: number,
    netCalorieBalance: number, integrityBonus: number, tip: string }
  Rules: CLEAN means majority whole foods, lean proteins, complex carbs, adequate hydration →
    integrityBonus: 50. CHEAT means junk food, fried food, excessive sugar, alcohol, fast food →
    integrityBonus: 0. NEUTRAL means mixed quality or insufficient description → integrityBonus: 25.
  netCalorieBalance = estimatedCaloriesIn minus [caloriesBurned value provided].
  tip must be exactly one sentence, maximum 15 words, specific and motivating."
  
  Inject caloriesBurned value into the prompt.

Method 3 — chat(systemPrompt: string, history: Content[], message: string): Promise<string>

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.8, maxOutputTokens: 400 } })
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(message)
  return result.response.text()

Method 4 — generateTrainingPlan(summary: string): Promise<ITrainingDay[]>

  Exact prompt (use verbatim):
  "Generate a personalized 7-day training plan for a college runner. Return ONLY a raw JSON
  array with no markdown: [{ day: string, type: 'Rest'|'Easy'|'Tempo'|'Long'|'Sprint'|'Cross-train',
  distanceKm: number|null, targetCalories: number, durationMinutes: number, notes: string }]
  Rules: notes maximum 20 words. Hard days must be followed by easy or rest days.
  Saturday or Sunday = longest run. Progressive overload from previous week.
  Base the plan on this athlete's recent data: [SUMMARY_PLACEHOLDER]"
  Replace [SUMMARY_PLACEHOLDER] with the summary argument.

━━━ ENDPOINTS ━━━

POST /api/workouts/ocr: already wired in Prompt 04. Uses parseScreenshot. No changes needed.

POST /api/coach/diet-analyze:
  Zod: { description: z.string().min(10).max(500), caloriesBurned: z.number().positive() }
  Call geminiService.analyzeDiet(description, caloriesBurned)
  Return IDietCard. Do NOT save — saving happens when post is submitted.

POST /api/coach/chat:
  Zod: { message: z.string().min(1).max(1000),
         history: z.array(z.object({ role: z.enum(['user','model']), parts: z.array(z.object({ text: z.string() })) })) }
  
  1. Fetch user stats: last 30 days posts aggregated:
     { totalDistanceKm, avgCaloriesPerRun, bestPaceMinPerKm, workoutsThisMonth }
  2. Fetch: currentStreak, weeklyScore, territoriesCount, battlesWon, battlesLost, college
  3. Build system prompt (inject all values):
  
  "You are Vikas Yadav, the AI performance coach for ICHOR — a campus social fitness battleground
  where college athletes compete for territory, leaderboard dominance, and glory.
  You are intense, data-driven, and motivating. You speak like a performance coach, not a
  wellness app. Keep responses mobile-optimized: maximum 3 short paragraphs. No markdown
  headers, no bullet points — flowing sentences only. Always reference the user's actual
  numbers when relevant. User stats: {totalDistanceKm}km this month,
  {avgCaloriesPerRun} avg calories per run, best pace {bestPaceMinPerKm} min/km,
  {currentStreak}-day streak, weekly score {weeklyScore}, {territoriesCount} territories
  held, {battlesWon} battles won, {battlesLost} battles lost. College: {college}."
  
  4. Call geminiService.chat(systemPrompt, history, message)
  5. Return { reply }

POST /api/coach/training-plan:
  1. Fetch last 4 weeks of user posts: compute avgWeeklyRuns, avgWeeklyDistanceKm, avgPace, trend
  2. Build summary string: "Athlete ran avg {X} times/week, avg {Y}km/week, avg pace {Z} min/km.
     Trend is {improving|stable|declining}. Current streak: {N} days."
  3. Call geminiService.generateTrainingPlan(summary)
  4. Parse JSON array (strip fences first).
  5. Save to user.weeklyPlan (User.findByIdAndUpdate with $set weeklyPlan)
  6. Return { plan: ITrainingDay[] }

━━━ FRONTEND ━━━

apps/web/app/(app)/coach/page.tsx:

Two-panel layout on desktop (sidebar: history + chips | main: chat).
Single column on mobile (chips as horizontal scroll above input).

Vikas Yadav header: abstract lavender SVG geometry shape (not human face), "DHRUV" in Neighbour font.

Chat UI:
  Messages in useState (not persisted — session only). Send full history with each call.
  User messages: right-aligned, rounded-[16px_16px_4px_16px], #AE93F4 bg, dark text, Inter Bold.
  Vikas Yadav messages: left-aligned, rounded-[16px_16px_16px_4px], #1A1619 bg, white text, Inter 300.
  Typing indicator: 3 dots pulsing, #AE93F4, absolutely positioned below last message.
  Input: full-width dark input, send button #AE93F4 →, keyboard shortcut Enter to send.

Starter chips (horizontal scroll, shown before first message):
  ["Analyze my week 📊", "How do I burn more? 🔥", "Plan my training 🗓",
   "Should I take this challenge? ⚔️", "Best strategy for 5km? 🏃",
   "Am I improving? 📈", "What should I eat before a run? 🍌"]

Training plan card (on profile page, fetched on profile load):
  7-day horizontal scroll. Each day: type badge (color-coded), km target, calorie target, notes.
  Today highlighted with #AE93F4 background. Past days dimmed. Future days normal.
  Type colors: Rest=gray, Easy=green, Tempo=amber, Long=#AE93F4, Sprint=#FDA2DE, Cross=teal.
```

---

## PROMPT 10 — Push Notifications + Final Cron Jobs

```
Implement Firebase Web Push notifications and finalize all cron job implementations.
FCM web push — works in desktop browsers and mobile browsers (Chrome, Edge, Firefox).
All 9 notification types. All 7 cron jobs finalized with full error handling.

━━━ BACKEND — notificationService.ts ━━━

import * as admin from 'firebase-admin'
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON)) })

async function sendPush(userId: string, notification: INotificationPayload): Promise<void>
  1. User.findById(userId).select('fcmToken') — lean query
  2. If !fcmToken: return (skip silently — log at debug level only)
  3. const message: admin.messaging.Message = {
       token: fcmToken,
       notification: { title: notification.title, body: notification.body },
       data: { deepLink: notification.deepLink },
       webpush: {
         notification: { icon: '/icon-192.png', badge: '/badge-72.png', vibrate: [200,100,200] },
         fcmOptions: { link: notification.deepLink }
       }
     }
  4. await admin.messaging().send(message)
  5. On error (messaging/registration-token-not-registered OR messaging/invalid-registration-token):
     User.updateOne({ _id: userId }, { $unset: { fcmToken: 1 } })  — clean up invalid token
  6. On other error: Sentry.captureException + log, do NOT throw (push should never crash a request)

All 9 notification payloads (use these exact strings):

TERRITORY_CHALLENGED:   title: '⚔️ Your Territory is Under Attack',
                        body: '[attackerName] is challenging [territoryName]. Respond within 48 hours.',
                        deepLink: '/map'

CHALLENGE_ACCEPTED:     title: '✅ Challenge Accepted',
                        body: '[attackerName] is ready to battle for [territoryName]. May the best runner win.',
                        deepLink: '/territory/[id]'

TERRITORY_LOST:         title: '💥 Territory Lost',
                        body: '[winnerName] claimed [territoryName]. Challenge them back.',
                        deepLink: '/map'

TERRITORY_CLAIMED:      title: '🏆 Territory Claimed',
                        body: 'You now control [territoryName]. Defend it.',
                        deepLink: '/territory/[id]'

KUDOS_RECEIVED:         title: '👊 [senderName] sent you kudos',
                        body: 'They loved your [distanceKm]km run.',
                        deepLink: '/feed'

CHALLENGE_EXPIRING:     title: '⏰ Challenge Expiring in 24 Hours',
                        body: 'Your challenge for [territoryName] expires soon. Respond or forfeit.',
                        deepLink: '/map'

STREAK_REMINDER:        title: '🔥 Protect Your [N]-Day Streak',
                        body: "Post today's workout to keep your streak alive.",
                        deepLink: '/import'

GROUP_RUN_STARTING:     title: '🏁 [title] Starts in 15 Minutes',
                        body: 'Get ready at [location]. Your squad is waiting.',
                        deepLink: '/grouprun/[id]'

CLAN_WAR_DECLARED:      title: '⚔️ Clan War!',
                        body: '[enemyClanName] declared war on [yourClanName]. Top 3 runners, step up.',
                        deepLink: '/clans/[id]'

━━━ FRONTEND — FIREBASE WEB PUSH ━━━

apps/web/lib/firebase.ts:
  Initialize Firebase client app with all NEXT_PUBLIC_FIREBASE_* env vars.
  Export: messaging() function (lazy-init, returns null if not supported)

apps/web/hooks/usePushNotifications.ts:
  On mount (after login):
  1. Check: 'Notification' in window && 'serviceWorker' in navigator
  2. If supported: await Notification.requestPermission()
  3. If granted: const token = await getToken(messaging(), { vapidKey: VAPID_KEY })
  4. PATCH /api/users/fcm-token with { token }
  5. Listen for foreground messages: onMessage(messaging(), (payload) => showInAppToast(payload))

apps/web/public/firebase-messaging-sw.js:
  Service worker for background notifications:
  importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.x.x/firebase-messaging-compat.js')
  Initialize Firebase, set up background message handler.
  On notification click: clients.openWindow(event.notification.data.deepLink)

apps/web/app/(app)/layout.tsx:
  Call usePushNotifications() at the top of the protected layout.
  Handle notification tap: window.addEventListener('notificationclick', ...) → router.push(deepLink)

━━━ FINALIZE ALL CRON JOBS ━━━

jobs/index.ts — complete file:
  import cron from 'node-cron'
  import * as Sentry from '@sentry/node'
  import { weeklyResetJob } from './weeklyReset'
  import { dailyStreakJob } from './dailyStreak'
  import { streakReminderJob } from './streakReminder'
  import { challengeExpiryJob } from './challengeExpiry'
  import { groupRunReminderJob } from './groupRunReminder'
  import { territoryRecalcJob } from './territoryRecalc'
  import { scoreSyncJob } from './scoreSync'

  export function startCronJobs() {
    const jobs = [
      { name: 'weeklyReset',      schedule: '0 0 * * 1',    tz: 'Asia/Kolkata', fn: weeklyResetJob },
      { name: 'dailyStreak',      schedule: '59 23 * * *',  tz: 'Asia/Kolkata', fn: dailyStreakJob },
      { name: 'streakReminder',   schedule: '0 20 * * *',   tz: 'Asia/Kolkata', fn: streakReminderJob },
      { name: 'challengeExpiry',  schedule: '0 * * * *',    tz: 'Asia/Kolkata', fn: challengeExpiryJob },
      { name: 'groupRunReminder', schedule: '*/5 * * * *',  tz: 'Asia/Kolkata', fn: groupRunReminderJob },
      { name: 'territoryRecalc',  schedule: '0 2 * * *',    tz: 'Asia/Kolkata', fn: territoryRecalcJob },
      { name: 'scoreSync',        schedule: '0 */6 * * *',  tz: 'Asia/Kolkata', fn: scoreSyncJob },
    ]
    
    jobs.forEach(({ name, schedule, tz, fn }) => {
      cron.schedule(schedule, async () => {
        const start = Date.now()
        console.log(`[CRON] ${name} starting at ${new Date().toISOString()}`)
        try { await fn() }
        catch (err) {
          Sentry.captureException(err, { tags: { cronJob: name } })
          console.error(`[CRON] ${name} FAILED:`, err)
        }
        console.log(`[CRON] ${name} done in ${Date.now()-start}ms`)
      }, { timezone: tz })
      console.log(`[CRON] ${name} registered: ${schedule} (${tz})`)
    })
  }
```

---

## PROMPT 11 — Profile + Admin + Full Polish + Launch

```
Build the user profile, admin dashboard, complete all UI polish, and prepare for launch.
This is the final prompt. After this, ICHOR is ready to deploy.

━━━ PROFILE PAGE ━━━

apps/web/app/(app)/profile/[userId]/page.tsx:
Server component: fetch user data on server. Client components for interactive sections.

HERO SECTION:
  Dark banner with subtle lavender radial gradient behind avatar.
  Avatar: 96px, rounded-full, ring-2 ring-[#AE93F4]
  Name: Neighbour font, 32px, white
  Clan badge: colored pill with tag
  Career Score: large, gold gradient text (#D4AF37), label "Career Score" in Inter Light
  Action buttons (if not own profile): "⚔️ Challenge" → create attack on top territory

STATS ROW (4 dark cards, lavender top border 2px):
  Total Distance (km) | Total Workouts | Total Calories | Territories Held
  Each: value in Neighbour 28px, label in Inter Light 12px #6B6570

BATTLE RECORD:
  Horizontal bar: wins (lavender) / losses (pink blush) proportional fill.
  "Wins: X — Losses: Y" text.

STREAK & INTEGRITY:
  Streak: flame emoji + number + "days" in Neighbour, personal best below.
  Integrity tier: progress bar to next tier.
    0–99: Novice | 100–499: Committed | 500–999: Honest Athlete | 1000+: Integrity Champion

WEEKLY TRAINING PLAN CARD (collapsible, lavender chevron):
  On open: if no plan cached → POST /api/coach/training-plan (show skeleton while loading).
  7-day horizontal scroll, each day card 120px wide. Type badge, km, calories, notes.

ACTIVITY HEATMAP (52 weeks × 7 days grid):
  Pure CSS grid, 5px × 5px cells, 2px gap.
  Color scale: 0 calories → #2D2630 (darkest), max → #AE93F4 (brightest).
  Hover tooltip: date + calories + workout type.
  Current day: ring-1 ring-white.

BADGES:
  Horizontal scroll of earned badges only. 60px icons with name below.
  Full badge list with lock icon for unearned.
  Tooltip on hover: how to earn.

MY TERRITORIES: Card list of owned territories with weekly score and rank.
MY POSTS: 3-column photo grid. Next.js Image, object-cover, tap → opens post detail.

━━━ BADGE SERVICE ━━━

services/badgeService.ts:

interface IBadgeDefinition {
  name: string
  check(user: IUser, context?: any): boolean
  description: string
}

All badge definitions in a config array (Open/Closed — add new badges, never modify check logic):
  [
    { name: 'First Run',         check: (u) => u.stats.totalWorkouts >= 1 },
    { name: 'Streak 7',          check: (u) => u.stats.streakDays >= 7 },
    { name: 'Streak 30',         check: (u) => u.stats.streakDays >= 30 },
    { name: 'Streak 100',        check: (u) => u.stats.longestStreak >= 100 },
    { name: 'Calorie King',      check: (u, ctx) => ctx?.weeklyRank === 1 },
    { name: 'Territory Conqueror', check: (u) => u.stats.territoriesHeld >= 5 },
    { name: 'Battle Hardened',   check: (u) => u.stats.battlesWon >= 10 },
    { name: 'Integrity Champion', check: (u) => u.stats.integrityPoints >= 1000 },
    { name: 'Speed Demon',        check: (u, ctx) => ctx?.bestPace < 5.0 },
    { name: 'Century Runner',     check: (u) => u.stats.totalDistanceKm >= 100 },
    { name: 'Clan Chief',         check: (u, ctx) => ctx?.isClanLeader === true },
  ]

async checkAndAwardBadges(userId: string, context?: any):
  Fetch user badges array (already earned names).
  For each definition: if check passes AND name not in earned → add to user.badges.
  Use $addToSet to avoid duplicates.
  For each new badge: notificationService.sendPush(userId, badge notification).

Call checkAndAwardBadges from: post save, weekly reset (with weeklyRank context), battle resolve.

━━━ ADMIN DASHBOARD ━━━

Route group: apps/api/src/routes/admin.ts — protected by adminAuth middleware (checks ADMIN_SECRET header).
No authentication via Clerk — separate header for simplicity.

GET /admin — dashboard stats:
  Parallel queries: { totalUsers, postsToday, activeGroupRuns, totalTerritories, flaggedPostsCount }
  Return as { stats }

GET /admin/flagged:
  Post.find({ 'engagement.flagCount': { $gte: 3 }, 'workout.verificationStatus': 'FLAGGED' })
  .populate('userId', 'name').populate('workoutId', 'screenshotUrl').sort('-flagCount').limit(50)

POST /admin/posts/:id/verify: reset flagCount to 0, workout.verificationStatus VERIFIED.
POST /admin/posts/:id/remove: delete Post, decrement user totalWorkouts and totalCalories.
GET /admin/territories: all territories, owner info, weekly scores.
POST /admin/territories: manual territory creation with point coordinates.
DELETE /admin/territories/:id.
GET /admin/users?page=: paginated user list.
POST /admin/users/:id/ban: User.updateOne { isBanned: true }, revoke Clerk session.

━━━ GLOBAL UI POLISH ━━━

Error Boundary (components/ErrorBoundary.tsx):
  Class component. On error: show centered ICHOR logo + "Something went wrong. We're on it."
  + "Go Home" button → router.push('/')
  Wrap every page in (app)/layout.tsx with ErrorBoundary.

Skeleton components: For every list and card component, create a matching Skeleton variant:
  SkeletonCard (ActivityCard loading state — same dimensions, animate-pulse)
  SkeletonRow (LeaderboardRow loading)
  SkeletonStat (StatChip loading)
  Show skeletons while React Query isFetching.

Empty states (EmptyState component): props: icon (React node), headline, subtext, action? { label, href }
  feed empty: "No workouts posted yet. Import your first run." → /import
  leaderboard empty: "No runners in this area yet. Be the first!" → /import
  territories empty: "No territories nearby. Post a workout to claim one." → /import
  clan empty: "You're not in a clan. Create one or search." → /clans

Toast system (lib/toast.ts): wrapping shadcn toast or react-hot-toast.
  success: #AE93F4 bg, dark text. error: #FDA2DE bg. info: #2D2630 bg. auto-dismiss 4s.

Offline detection: (app)/layout.tsx:
  window.addEventListener('online'|'offline')
  Show sticky amber banner on 'offline': "You're offline. Posts will sync when reconnected."
  Dismiss on 'online'.

Mobile bottom nav (components/BottomNav.tsx):
  Shown only on mobile (md:hidden).
  5 icons: Feed (Flame) | Import (Plus) | Map (Map) | Leaderboard (Trophy) | Profile (User)
  Active: #AE93F4 icon. Inactive: #6B6570.
  Fixed bottom, #1A1619 background, top border 1px #2D2630.

Image optimization: All <img> tags replaced with next/image.
  Cloudinary images: add f_auto,q_auto,w_800 transformations to URL for feed.
  Thumbnails: w_200 transformation.

Page transitions: globals.css: .page-enter { animation: fadeIn 150ms ease-out }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; translateY(0) } }

━━━ SENTRY INTEGRATION ━━━

apps/web: next.config.js wrapped with withSentryConfig.
  sentry.client.config.ts: Sentry.init with SENTRY_DSN, tracesSampleRate: 0.2
  sentry.server.config.ts: same
  All catch blocks in async functions: Sentry.captureException(err)

apps/api: Sentry.init in app.ts before routes.
  Sentry.Handlers.requestHandler() before all routes.
  Sentry.Handlers.errorHandler() before global errorHandler.
  All cron job catch blocks already have Sentry.captureException (from Prompt 10).

━━━ RATE LIMITING SUMMARY ━━━

Implement in apps/api/src/middleware/rateLimiter.ts using express-rate-limit:
createRateLimiter(windowMs: number, max: number): RequestHandler

Apply per route group in app.ts:
  /api/feed              → 120 req/min
  /api/leaderboards/*    → 60 req/min
  /api/workouts/ocr      → 20 req/min  ← expensive Gemini call
  /api/coach/*           → 10 req/min  ← expensive Gemini call
  /api/posts             → 30 req/min
  /api/groupruns/*/sync  → 30 req/min  ← called every 60s per participant
  All other /api/*       → 100 req/min
  /admin/*               → 20 req/min

━━━ LAUNCH CHECKLIST ━━━
Create LAUNCH.md at repo root:

[ ] Vercel: all NEXT_PUBLIC_* env vars set in project settings
[ ] Railway: all server-side env vars set
[ ] MongoDB Atlas: whitelist Railway egress IP (or 0.0.0.0/0 for MVP)
[ ] MongoDB Atlas: confirm 2dsphere index exists on Territory.centroid (db.territories.getIndexes())
[ ] Clerk: production webhook URL set → https://your-api.railway.app/api/webhooks/clerk
[ ] Clerk: allowed domain set if restricting to college email
[ ] Firebase Console: add Vercel production domain to authorized domains
[ ] Google Maps API: restrict key to Vercel production domain
[ ] Google Cloud: enable Geocoding API + Maps JavaScript API + Fitness API
[ ] Cloudinary: upload preset set to signed, folder: ichor
[ ] node-cron timezone: confirmed 'Asia/Kolkata' in all job registrations
[ ] Sentry: test error captured in both web and api projects before launch
[ ] Run seed.ts on production DB to create initial territories
[ ] k6 load test: simulate 200 concurrent users before launch (free at k6.io)
[ ] Mobile browser test: Chrome Android + Safari iOS (web push, location, maps)
[ ] CSP headers: add Content-Security-Policy in next.config.js for Google Maps and Firebase
```

---

*ICHOR Super Prompts v2.0 — Final*
*Stack: Next.js + Express + MongoDB + Upstash Redis + Gemini + Clerk*
*Cost: $0 | Users: 500–700 concurrent | Principles: SOLID throughout*