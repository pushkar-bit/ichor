# ICHOR — Product Requirements Document & Antigravity Build Guide

> **App Name:** ICHOR  
> **Tagline:** Sweat. Post. Dominate.  
> **Platform:** iOS + Android (React Native + Expo)  
> **Version:** v1.0 — Full Pivot Build  
> **Status:** Pre-development

---

## PART 1: PRODUCT VISION

ICHOR is a campus-exclusive social fitness battleground. It is NOT a run tracking app. It is a platform where athletic effort — verified through health apps, wearables, and AI screenshot parsing — becomes social currency, territory, and power.

You don't track your runs inside ICHOR. You import them. You post them. You get judged on them. And then you fight for territory using those stats.

The core loop: **Run → Import → Post → Battle → Dominate.**

---

## PART 2: WHAT CHANGED FROM DHAAV

| Dhaav (Old) | ICHOR (New) |
|---|---|
| Native GPS background tracking | Removed entirely |
| Real-time run HUD | Removed |
| Strava-style live map drawing | Removed |
| Manual stat entry | Removed |
| Expo Location background mode | Removed |
| Apple Health / Google Fit sync | ✅ Added |
| Garmin /WHOOP / Strava / RunKeeper import | ✅ Added |
| AI screenshot OCR (Gemini Vision) | ✅ Added |
| Social post with calorie/diet honesty | ✅ Added |
| Rating and commenting on workouts | ✅ Added |
| Territory system (PostGIS) | ✅ Kept |
| Clans and battles | ✅ Kept |
| Leaderboards | ✅ Kept + expanded |
| Gemini AI Coach | ✅ Kept + expanded |
| Clerk Auth | ✅ Kept |

---

## PART 3: CORE FEATURE SPECIFICATION

### 3.1 — Health Data Ingestion Engine

**How workout data enters ICHOR:**

**Method A — Native Health Sync (Primary)**  
On app open, ICHOR silently fetches the last 7 days of workouts from the device health store.  
- iOS: Apple HealthKit via `react-native-health`  
- Android: Google Health Connect via `react-native-health-connect`  
- Data pulled: activity type, distance, duration, calories burned, average heart rate, start time  
- Only Running, Walking, Cycling workouts are imported  
- Duplicates detected by start timestamp — never imported twice  
- User sees a "New workouts found" banner and can approve or dismiss each one  

**Method B — Screenshot OCR Import (Secondary)**  
User takes a screenshot of their Strava, RunKeeper, Garmin, Nike Run Club, or any fitness app summary screen and uploads it in ICHOR.  
- ICHOR sends the image to the Gemini 1.5 Flash Vision API  
- Gemini extracts: distance, duration, pace, calories, date, activity type  
- Extracted data shown to user for confirmation before saving  
- User can manually correct any field before confirming  
- Screenshot is stored as proof/verification artifact on the activity  

**Method C — Wearable Deep Link (Future)**  
Garmin Connect IQ, Apple Watch, Fitbit APIs — planned for v2.

**Fraud Prevention:**  
- Screenshot is stored and publicly visible on the activity card  
- Community can flag activities as suspicious  
- 3 flags = activity auto-hidden pending admin review  
- Admin dashboard for reviewing flagged activities  

---

### 3.2 — Social Post System

Every imported or OCR-verified workout automatically creates a draft post. User must complete the post before it counts toward leaderboards or territory.

**Post composer fields:**  
- Auto-populated: activity type, distance, duration, calories, date  
- Required: at least one photo (run selfie, route screenshot, gym photo)  
- Optional: caption text (up to 300 characters)  
- Optional: Diet Honesty Card (see 3.3)  
- Optional: tag location (campus landmark from a preset list)  
- isPublic toggle (default: public within the club)  

**Activity Card (feed display):**  
- Header: avatar, name, time ago, activity type badge, verification badge (Health Sync = green tick, OCR = camera icon)  
- Hero photo (first uploaded photo)  
- Stats strip: Distance | Pace | Duration | Calories — clean icon + value layout  
- Diet Honesty Card if attached (see 3.3)  
- Caption  
- Proof section: screenshot thumbnail (if OCR import) — tap to expand full screenshot  
- Footer: Flame rating (1–5 flames), Comment count, Share button  

---

### 3.3 — Diet Honesty Card (Unique Feature)

This is the feature that makes ICHOR unlike any other fitness app.

After posting a workout, users are prompted: **"What did you eat today?"**  
This is voluntary but rewarded — honest diet logging earns "Integrity Points."

**Diet card types:**  
- Clean Eat: logged healthy meal → +integrity bonus  
- Cheat Day: logged junk food → shown on post publicly with a cheat emoji, slight leaderboard penalty  
- Skipped: said nothing → neutral  

**Leaderboard impact:**  
Base score = Calories Burned  
Final score = (Calories Burned × Consistency Multiplier) + Integrity Bonus - Cheat Penalty  

Consistency Multiplier: 1.0× base, +0.1× for every consecutive day with a post, max 2.0×  
Integrity Bonus: +50 points per honest diet log  
Cheat Penalty: -10% of calorie score if junk food logged  

This creates a meta-game: burn 1000 calories but ate pizza = your effective score drops. The community can see your diet card and react.

---

### 3.4 — Feed & Engagement

**Main Feed:**  
- Chronological feed of all club member posts  
- Filter tabs: All | Following | Clan | Top Today  

**Engagement actions:**  
- Flame Rating: 1–5 flames (replaces generic like button) — shown as average rating on the post  
- Comments: text only, nested replies  
- Kudos: quick tap to send a fire emoji to the poster  
- Flag: report suspicious activity stats  

**Activity detail screen:**  
- Full-size photos (swipeable gallery)  
- Full stats breakdown  
- Screenshot proof (if OCR)  
- Diet card  
- All comments  
- Map thumbnail if location tagged  

---

### 3.5 — Territory System (Adapted)

Territory is now assigned based on the location tagged in the post, not live GPS path.

**How territory works in ICHOR:**  
- Campus is divided into named zones (predefined by admin: Library Zone, Track Zone, Hostel Zone, etc.)  
- Each zone is a PostGIS polygon defined at setup  
- When you post a workout and tag a location, you claim that zone  
- If someone else tags the same zone and has better stats (higher calorie score that week), an automatic attack is triggered  
- Attack resolution: same as before — stat battle or scheduled sprint (sprint results entered manually with screenshot proof)  

**Territory display:**  
- Campus map view showing all zones  
- Colour-filled by owner / clan colour  
- Tap zone: see owner, their weekly stats in that zone, challenge button  

---

### 3.6 — Leaderboards (Expanded)

**Leaderboard categories:**  

1. **Calorie King** — most calories burned this week (primary leaderboard)  
2. **Grind Streak** — most consecutive days with a verified post  
3. **Pace God** — best average pace across all runs this week (min 3 runs)  
4. **Distance Destroyer** — most total km this week  
5. **Integrity Champion** — most Integrity Points from diet honesty  
6. **Clan Dominance** — clan ranked by combined calorie score + territory held  

All weekly leaderboards reset Monday 00:00. Monthly hall-of-fame preserves top 3.

---

### 3.7 — Clans

Same as Dhaav spec — Create clan, join clan (max 10), clan territory = union of member zones, clan vs clan battles, clan leaderboard.

New addition: **Clan Diet Pact** — clan can set a weekly diet challenge (e.g., "no sugar this week"). Members who comply get a clan integrity bonus.

---

### 3.8 — Gemini AI Features

**AI Coach (Dhruv):**  
- Chat bot with full conversation history  
- Context: user's last 30 days of imported workouts  
- Answers training, nutrition, and territory strategy questions  
- Weekly training plan generation (structured JSON, displayed as week card)  

**AI Screenshot Parser:**  
- Gemini Vision extracts workout data from any fitness app screenshot  
- Handles Strava, RunKeeper, Garmin, Nike Run Club, Apple Fitness, Samsung Health  
- Returns structured JSON: { activityType, distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned, date }  

**AI Diet Analyzer:**  
- User describes what they ate (free text)  
- Gemini classifies: Clean / Cheat / Neutral and estimates calorie intake  
- Returns: { classification, estimatedCalories, integrityBonus, suggestion }  

---

### 3.9 — Profile

- Stats: total distance, total workouts, total calories, territory held, battles won/lost  
- Streak calendar (GitHub-style heatmap of workout days)  
- Badges: Calorie King, Streak Master, Integrity Champion, Conqueror, etc.  
- Health sync status indicator  
- Connected apps display (which health source last synced)  
- Weekly training plan card (from Gemini)  

---

## PART 4: TECH STACK (UPDATED)

### Frontend
| Tool | Purpose |
|---|---|
| React Native + Expo SDK 51 | iOS + Android from one codebase |
| Expo Router v3 | File-based navigation |
| NativeWind v4 | Tailwind styling |
| Zustand | Global state (user, activePost, healthSync) |
| TanStack Query v5 | Server state, caching, infinite scroll |
| react-native-health | Apple HealthKit integration (iOS) |
| react-native-health-connect | Google Health Connect (Android) |
| expo-image-picker | Screenshot upload |
| react-native-maps | Campus zone map display |
| Reanimated 3 | Animations |

### Authentication
| Tool | Purpose |
|---|---|
| Clerk | Email OTP + Google OAuth, college domain gating |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express | REST API |
| Socket.io | Real-time feed updates, challenge notifications |
| Prisma ORM | Type-safe PostgreSQL queries |
| Zod | Request validation |
| BullMQ | Background jobs (leaderboard reset, challenge expiry) |
| @google/generative-ai | Gemini SDK (Vision + Chat) |
| firebase-admin | FCM push notifications |
| cloudinary | Photo + screenshot storage |
| svix | Clerk webhook verification |

### Database & Infrastructure
| Tool | Purpose |
|---|---|
| PostgreSQL + PostGIS | Users, posts, territory zones, activities |
| Redis | Leaderboard sorted sets, BullMQ queue, pub/sub |
| Railway | Backend + PostgreSQL + Redis hosting |
| Cloudinary | Media storage |
| Firebase FCM | Push notifications |
| Sentry | Error tracking |
| PostHog | Analytics |

### Google APIs Required
| API | Purpose |
|---|---|
| Gemini 1.5 Flash | Screenshot OCR, AI coach, diet analyzer |
| Maps SDK iOS + Android | Campus zone map display |
| Static Maps API | Zone thumbnail images |

---

## PART 5: DATABASE SCHEMA

### Core Models

**User:** id, clerkId, email, name, avatarUrl, bio, fcmToken, totalDistance, totalWorkouts, totalCalories, streakDays, integrityPoints, battlesWon, battlesLost, clanId, createdAt

**Workout:** id, userId, sourceType (HEALTH_SYNC | OCR_SCREENSHOT | MANUAL), activityType (RUN | WALK | CYCLE), distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned, heartRateAvg, workoutDate, externalId (dedup key), screenshotUrl, verificationStatus (PENDING | VERIFIED | FLAGGED), createdAt

**Post:** id, userId, workoutId (unique FK), caption, photoUrls[], locationZoneId, isPublic, avgFlameRating, flameCount, kudosCount, flagCount, createdAt

**DietCard:** id, postId (unique FK), description, classification (CLEAN | CHEAT | NEUTRAL), estimatedCalories, integrityBonus, createdAt

**FlameRating:** id, postId, userId, rating (1–5), createdAt — unique on postId+userId

**Comment:** id, postId, authorId, parentId (nullable for replies), text, createdAt

**CampusZone:** id, name, description, polygon (PostGIS geometry), color — seeded by admin at setup

**Territory:** id, zoneId (unique FK), ownerId, clanId, weeklyCalorieScore, acquiredAt, lastDefended

**Attack:** id, attackerId, defenderId, zoneId, status (PENDING|ACCEPTED|FORFEITED|RESOLVED|EXPIRED), type (STAT|SPRINT), scheduledAt, resolvedAt, winnerId, createdAt

**Clan:** id, name, tag, leaderId, color, dietPactDescription, createdAt

**ClanMember:** clanId, userId, role (LEADER|MEMBER), joinedAt

---

## PART 6: ENV VARIABLES

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_ALLOWED_DOMAIN=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
DATABASE_URL=
REDIS_URL=
GEMINI_API_KEY=
GOOGLE_MAPS_IOS_KEY=
GOOGLE_MAPS_ANDROID_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FIREBASE_SERVICE_ACCOUNT_JSON=
SENTRY_DSN=
```

---

## PART 7: BUILD PHASES

### Phase 1 — Foundation (Week 1–2)
1. Expo scaffold with TypeScript, Expo Router, NativeWind, Zustand, React Query
2. Clerk auth with college domain gating
3. PostgreSQL + PostGIS on Railway, Prisma schema and migration
4. Node.js backend with Clerk middleware, user sync webhook
5. Seed campus zones (predefined polygons for your college map)

### Phase 2 — Health Ingestion (Week 3–4)
1. Apple HealthKit integration (react-native-health)
2. Google Health Connect integration (react-native-health-connect)
3. Deduplication logic by externalId / start timestamp
4. "New workouts found" approval UI
5. OCR screenshot upload + Gemini Vision parsing
6. Post composer with manual field correction

### Phase 3 — Social Layer (Week 5–6)
1. Post composer: photos, caption, diet card, location zone tag
2. Activity feed: infinite scroll, filter tabs
3. Flame rating system
4. Comments with nested replies
5. Flag / report system
6. Activity detail screen

### Phase 4 — Game Systems (Week 7–9)
1. Campus zone map display with territory colours
2. Territory assignment logic (post + zone tag → territory claim)
3. Attack trigger when better stats detected
4. Challenge accept/forfeit/resolve UI
5. All 6 leaderboards with Redis sorted sets
6. BullMQ cron jobs (weekly reset, challenge expiry)
7. Clan system: create, join, leave, clan territory union

### Phase 5 — AI Features (Week 10–11)
1. Gemini AI Coach (Dhruv) chat UI
2. Diet analyzer endpoint
3. Weekly training plan generation
4. Screenshot OCR refinements

### Phase 6 — Polish & Launch (Week 12)
1. Push notifications for all events
2. Sentry + PostHog integration
3. Admin dashboard for flagged activities
4. App Store + Play Store submission

---

## PART 8: ANTIGRAVITY MASTER ORCHESTRATOR PROMPT

```
You are the Lead Principal Software Engineer behind "ICHOR" — a campus-exclusive social fitness battleground app built with React Native (Expo), Node.js, PostgreSQL + PostGIS, Redis, and Google Gemini AI.

Read this entire PRD before writing a single line of code. Your job is to implement the complete application systematically using Review-driven development in Google Antigravity.

CORE ARCHITECTURE RULES:
1. NO native GPS tracking. ICHOR does not track runs. All workout data comes from Apple HealthKit, Google Health Connect, or Gemini Vision OCR of screenshots.
2. Every workout must be posted to the social feed before it counts toward leaderboards or territory.
3. Territory is zone-based (predefined campus polygons), not GPS-path-based.
4. Gemini 1.5 Flash handles three tasks: screenshot OCR parsing, AI coach chat, and diet classification.
5. Leaderboards are primarily calorie-based, modified by consistency and diet honesty multipliers.
6. The Diet Honesty Card is a core differentiating feature — never skip it.

EXECUTION ORDER:
Step 1: Read and confirm you understand the full PRD.
Step 2: Ask me 3 clarifying questions maximum before starting.
Step 3: Begin with Prompt 01 (Scaffold) and proceed sequentially through all prompts.
Step 4: After each prompt completes, show me what was built and wait for my approval before moving to the next.

TECH STACK (non-negotiable):
- Frontend: React Native + Expo SDK 51, TypeScript strict, Expo Router v3, NativeWind v4, Zustand, TanStack Query v5
- Auth: Clerk
- Backend: Node.js + Express, Prisma, Zod, BullMQ, Socket.io
- DB: PostgreSQL + PostGIS + Redis (Railway)
- AI: Gemini 1.5 Flash (@google/generative-ai SDK)
- Media: Cloudinary
- Notifications: Firebase Admin FCM
- Maps: react-native-maps with Google Maps

Do not improvise on the stack. Do not add packages not listed. Do not skip the Diet Honesty Card feature. Do not implement any GPS tracking whatsoever.

Start by reading the full PRD attached to this project and confirm your understanding.
```

---

## PART 9: SEQUENTIAL ANTIGRAVITY PROMPTS

---

### PROMPT 01 — Project Scaffold

```
Scaffold the complete ICHOR app — a campus social fitness battleground built on React Native + Expo.

Create an Expo SDK 51 project with TypeScript strict mode named "ichor".

Setup:
- Expo Router v3 (file-based navigation)
- NativeWind v4
- Zustand (global state)
- TanStack Query v5 with a queryClient (staleTime: 30s, retry: 2)
- Axios base instance reading from EXPO_PUBLIC_API_URL, auto-attaches Clerk JWT

Folder structure:
app/                  → Expo Router screens
components/ui/        → Button, Card, Avatar, Badge, FlameRating, StatChip
components/features/  → feature-specific composed components
hooks/                → custom hooks
stores/               → Zustand slices
services/             → API call functions (one file per feature domain)
utils/                → formatters, date helpers, score calculators
constants/            → colors.ts, config.ts, zones.ts
types/                → User, Workout, Post, Territory, Clan, Attack, DietCard

Screens to scaffold (placeholder only):
(auth)/login
(auth)/register
(tabs)/home        → Feed
(tabs)/map         → Campus zone territory map
(tabs)/import      → Import workout (health sync or screenshot)
(tabs)/leaderboard → All leaderboards
(tabs)/profile     → User profile

Tab navigator: icons from Lucide (Flame, Map, Plus, Trophy, User)

Zustand stores:
- userSlice: { id, name, avatar, clanId, token, streakDays, integrityPoints }
- importSlice: { pendingWorkouts[], currentDraft, draftPost }
- feedSlice: { optimisticPosts[] }

Constants:
- colors.ts: primary #C41E3A (deep crimson — ICHOR brand), dark #0D0D0D, accent gold #D4AF37
- config.ts: API_URL, ALLOWED_DOMAIN, APP_NAME: "ICHOR"

Create .env.example with all required variables.

Do NOT implement any GPS tracking, expo-location, or background location anything.
```

---

### PROMPT 02 — Clerk Auth + User Sync

```
Integrate Clerk authentication into ICHOR.

Frontend:
- Install @clerk/clerk-expo, wrap _layout.tsx with ClerkProvider
- Login screen: email OTP + Google OAuth. Brand color #C41E3A. Loading states, error handling.
- Register screen: validate email domain matches EXPO_PUBLIC_ALLOWED_DOMAIN. Clear error if wrong domain.
- Protect all (tabs) routes — redirect to /login if unauthenticated
- After login: POST /api/users/sync with { clerkId, email, name, avatarUrl }
- Axios request interceptor: auto-attach Clerk JWT Bearer token to every request
- Custom hook useCurrentUser: returns merged Clerk + DB user

Backend (Node.js/Express):
- POST /webhooks/clerk: verify signature with svix + CLERK_WEBHOOK_SECRET. On user.created: upsert user in PostgreSQL via Prisma.
- requireAuth middleware: validates Clerk JWT, attaches req.userId
- POST /api/users/sync: upsert user, return full user record
- PATCH /api/users/profile: update name, bio, avatarUrl
- PATCH /api/users/fcm-token: save FCM push token

Domain gating: if EXPO_PUBLIC_ALLOWED_DOMAIN is set, reject registrations where email domain does not match. Show error: "ICHOR is exclusive to [domain] accounts."
```

---

### PROMPT 03 — PostgreSQL Schema + PostGIS Zones

```
Implement the complete database setup for ICHOR.

Prisma schema — all models:

User: id, clerkId(unique), email, name, avatarUrl, bio, fcmToken, totalDistanceKm(Float,0), totalWorkouts(Int,0), totalCalories(Int,0), streakDays(Int,0), integrityPoints(Int,0), battlesWon(Int,0), battlesLost(Int,0), clanId(optional FK), createdAt

Workout: id, userId(FK), sourceType(enum: HEALTH_SYNC,OCR_SCREENSHOT,MANUAL), activityType(enum: RUN,WALK,CYCLE), distanceKm(Float), durationSeconds(Int), avgPaceMinPerKm(Float,optional), caloriesBurned(Int), heartRateAvg(Int,optional), workoutDate(DateTime), externalId(String,optional — dedup key), screenshotUrl(optional), verificationStatus(enum: PENDING,VERIFIED,FLAGGED, default PENDING), createdAt

Post: id, userId(FK), workoutId(unique FK), caption(optional), photoUrls(String[]), locationZoneId(optional FK to CampusZone), isPublic(Bool,true), avgFlameRating(Float,0), flameCount(Int,0), kudosCount(Int,0), flagCount(Int,0), createdAt

DietCard: id, postId(unique FK), description(String), classification(enum: CLEAN,CHEAT,NEUTRAL), estimatedCalories(Int,optional), integrityBonus(Int), createdAt

FlameRating: id, postId(FK), userId(FK), rating(Int 1-5), createdAt — @@unique([postId,userId])

Comment: id, postId(FK), authorId(FK), parentId(optional self-FK), text, createdAt

CampusZone: id, name, description, color — polygon handled via raw SQL PostGIS

Territory: id, zoneId(unique FK CampusZone), ownerId(optional FK User), clanId(optional FK Clan), weeklyCalorieScore(Int,0), acquiredAt(optional), lastDefended(optional)

Attack: id, attackerId(FK), defenderId(FK), zoneId(FK), status(enum: PENDING,ACCEPTED,FORFEITED,RESOLVED,EXPIRED), type(enum: STAT,SPRINT), scheduledAt(optional), resolvedAt(optional), winnerId(optional FK), createdAt

Clan: id, name, tag(String — 4 chars unique), leaderId(FK), color, dietPactDescription(optional), battlesWon(Int,0), createdAt

ClanMember: clanId(FK), userId(FK), role(enum: LEADER,MEMBER), joinedAt — @@id([clanId,userId])

Indexes: userId on Workout and Post, status on Attack, zoneId on Territory.

Raw SQL migration:
- CREATE EXTENSION IF NOT EXISTS postgis;
- ALTER TABLE campus_zones ADD COLUMN polygon geometry(Polygon,4326);
- ALTER TABLE campus_zones ADD COLUMN centroid geometry(Point,4326);
- CREATE INDEX campus_zones_polygon_gist ON campus_zones USING GIST(polygon);

Seed file:
- 5 test users with varied stats
- 8 campus zones with realistic polygon coordinates (use a 1km x 1km college campus grid, center at 28.6139,77.2090 — New Delhi)
- Territory records for some zones
- 10 sample posts with workouts

Create db.ts Prisma singleton and redisClient.ts ioredis singleton.
```

---

### PROMPT 04 — Health Sync + OCR Import Engine

```
Build the complete workout import system for ICHOR — the app's core data ingestion engine.

This replaces all GPS tracking. There is no expo-location in this project.

PART A — Apple HealthKit (iOS)

Install react-native-health. Create hooks/useHealthKit.ts:
- Request permissions on mount: steps, workouts, calories, heart rate, distance
- fetchRecentWorkouts(days: 7): query HKWorkoutType for the last 7 days
- Filter to only Running, Walking, Cycling
- Map to ICHOR Workout shape: { externalId: workout.uuid, activityType, distanceKm, durationSeconds, avgPaceMinPerKm, caloriesBurned, heartRateAvg, workoutDate }
- Return array — dedup handled by backend

PART B — Google Health Connect (Android)

Install react-native-health-connect. Create hooks/useHealthConnect.ts:
- Request READ permissions: ExerciseSession, TotalCaloriesBurned, Distance, HeartRate
- fetchRecentWorkouts(days: 7): query ExerciseSessionRecord
- Map to same ICHOR Workout shape
- Use session.metadata.id as externalId

PART C — Unified Import Hook

Create hooks/useWorkoutImport.ts:
- Detects platform (iOS → HealthKit, Android → Health Connect)
- Calls appropriate hook
- POSTs each workout to POST /api/workouts/sync with dedup check
- Backend returns { created: [], alreadyExists: [] }
- Stores new ones in importSlice Zustand store as pendingWorkouts
- Shows approval UI

PART D — Approval UI (app/(tabs)/import.tsx)

Two sections:
1. "New Workouts Found" — list of pending workouts from health sync, each with: activity icon, date, distance, calories, duration, "Add to ICHOR" button and "Dismiss" button
2. "Import from Screenshot" — camera button + gallery picker using expo-image-picker

On "Add to ICHOR": navigate to post composer (app/post/create.tsx) with workout pre-filled.

PART E — Screenshot OCR (POST /api/workouts/ocr)

Backend endpoint:
1. Receive image (multipart form data), upload to Cloudinary, get URL
2. Send to Gemini 1.5 Flash Vision:
   System: "You are a fitness data extractor. Extract workout data from this fitness app screenshot. Return ONLY valid JSON with keys: activityType (RUN|WALK|CYCLE), distanceKm (number), durationSeconds (number), avgPaceMinPerKm (number or null), caloriesBurned (number), workoutDate (ISO string). If a field cannot be determined, use null."
3. Parse JSON response (strip markdown fences if present)
4. Return { extracted, screenshotUrl } to frontend
5. Frontend shows extracted data in editable form fields before user confirms

PART F — Backend sync endpoint (POST /api/workouts/sync)
- Body: array of workout objects with externalId
- For each: check if externalId already exists for this user
- If new: INSERT, set verificationStatus VERIFIED (came from health store)
- Return { created: count, alreadyExists: count }

No GPS. No expo-location. No background tracking. Health store data only.
```

---

### PROMPT 05 — Post Composer + Social Feed

```
Build the complete social posting system and activity feed for ICHOR.

POST COMPOSER (app/post/create.tsx)

Receives workout data as navigation params (from health sync approval or OCR confirmation).

Screen layout:
1. Stats preview card at top (read-only): activity type icon, distance, duration, calories in a clean dark card
2. Photo upload section: required — user must upload at least 1 photo. Use expo-image-picker. Max 5 photos. Show thumbnail grid. Upload to Cloudinary via POST /api/upload.
3. Caption input: 300 char limit, character counter
4. Location Zone picker: dropdown of CampusZone names. Optional. "Where did you work out?"
5. Diet Honesty Card section (collapsible, titled "Fuel Log — optional but rewarded"):
   - Text field: "What did you eat today?" 
   - Submit to POST /api/coach/diet-analyze which calls Gemini to classify
   - Show classification result: CLEAN (green), CHEAT (red emoji), NEUTRAL (gray)
   - User confirms or skips
6. isPublic toggle
7. "Post to ICHOR" submit button

On submit: POST /api/posts with all data. On success: navigate to feed.

ACTIVITY FEED (app/(tabs)/home.tsx)

useInfiniteQuery against GET /api/feed?cursor= (cursor = post createdAt).
Pull to refresh. "New posts" pill badge when Socket.io signals new content.
Filter tabs: All | Following | Clan | Top Today

ActivityCard component (components/features/ActivityCard.tsx):

Top to bottom:
- Header: avatar (36px), name (bold), time ago, activity type badge (Run/Walk/Cycle), verification badge (green tick = Health Sync, camera icon = OCR Screenshot)
- Hero photo (first photo, 16:9, full width, rounded 12px corners)
- Stats strip: 4 columns — Distance | Pace | Duration | Calories
- Diet Honesty Card (if present): small pill showing CLEAN/CHEAT emoji + estimated calories in/out balance
- Caption (3 lines max, "See more" expand)
- Screenshot proof (if OCR): small thumbnail labelled "Verified Screenshot" — tap to expand
- Footer: FlameRating component (5 flame icons, tap to rate), comment count, kudos button, share

FlameRating component: shows average rating as filled/half/empty flame icons. Tap to rate 1–5.

BACKEND ENDPOINTS:

POST /api/posts: save post + workout linkage + optional diet card + optional zone claim. Trigger territory claim logic asynchronously via BullMQ.
GET /api/feed?cursor=: paginated, 20 per page. Cursor-based on createdAt. Includes author, workout, dietCard, flameRatings average.
POST /api/upload: sign Cloudinary upload server-side, return secure_url.
POST /api/posts/:id/flame: upsert FlameRating (1–5). Recalculate avgFlameRating on Post.
POST /api/posts/:id/kudos: toggle kudos, increment/decrement kudosCount.
POST /api/posts/:id/flag: increment flagCount. If flagCount >= 3: set workout verificationStatus to FLAGGED, hide post from feed, notify admin.
GET /api/posts/:id/comments: flat list + nested replies
POST /api/posts/:id/comments: create comment, optional parentId for reply

SOCKET.IO: On new post created, emit "feed:new_post" to all connected clients in the club room. Frontend shows "New posts" pill.
```

---

### PROMPT 06 — Territory Zone Map + Attack System

```
Build the territory system and campus zone map for ICHOR.

This is zone-based territory (predefined campus polygons), not GPS-path-based.

CAMPUS MAP SCREEN (app/(tabs)/map.tsx)

Full-screen react-native-maps Google Maps view.
On mount: fetch GET /api/zones (all campus zones with territory info).
Render each zone as a Polygon:
- fillColor from territory owner's clan color or a default palette (40% opacity)
- strokeColor 100% opacity, strokeWidth 2
- Unclaimed zones: gray fill, dashed stroke
- Current user's zone: crimson #C41E3A stroke, strokeWidth 4
- Zone name label via Marker at centroid

Tap any zone: open bottom sheet (react-native-bottom-sheet) showing:
- Zone name and description
- If unclaimed: "Claim this zone" (requires posting a workout tagged here)
- If owned by current user: stats panel — your weekly calorie score here, last defended date
- If owned by another: owner avatar, name, their weekly calorie score, "Challenge" button
- If owned by clan member: "Clan Zone" badge

Challenge flow (bottom sheet → AttackSheet):
- Show attacker vs defender calorie scores for that zone
- If attacker score is already higher: "Your stats dominate — Claim automatically" button → POST /api/attacks (auto-resolves as attacker win)
- If defender score is higher: "Schedule a sprint" (date/time picker) or "Request stat battle" (both log proof screenshots)
- Confirm → POST /api/attacks

TERRITORY SERVICE (backend — services/territoryService.ts):

Function: claimZone(userId, zoneId, calorieScore)
- Check if Territory record exists for zoneId
- If not: create Territory with ownerId = userId
- If yes and same user: update weeklyCalorieScore
- If yes and different user: compare weeklyCalorieScore. If new score is higher: create Attack PENDING record. Else: no attack.

Function: resolveAttack(attackId, winnerId)
- Update Territory ownerId to winnerId
- Update battlesWon/battlesLost on both users
- Notify both via FCM

BACKEND ENDPOINTS:

GET /api/zones: all CampusZones with territory (ownerId, ownerName, ownerAvatarUrl, clanColor, weeklyCalorieScore) as GeoJSON FeatureCollection
POST /api/attacks: create attack, notify defender
POST /api/attacks/:id/respond: { action: ACCEPT | FORFEIT }
POST /api/attacks/:id/resolve: { winnerId } — manual resolution after sprint with screenshot proof
GET /api/attacks/incoming: all PENDING attacks where current user is defender
GET /api/attacks/outgoing: all PENDING attacks where current user is attacker

BullMQ job — weeklyZoneReset: every Monday 00:00, reset all Territory.weeklyCalorieScore to 0. This means every week starts fresh — last week's dominance does not automatically carry over, users must re-post to re-claim.

Incoming attack banner: persistent banner at top of map screen if user has PENDING incoming attacks. Tap → list of challenges with respond buttons.
```

---

### PROMPT 07 — Leaderboards + Scoring Engine

```
Build the complete leaderboard system and scoring engine for ICHOR.

SCORING ENGINE (services/scoreService.ts):

Calculate user's leaderboard score for a given week:

baseCalories = SUM of workout.caloriesBurned where workoutDate in current week AND post exists (only posted workouts count)

consistencyMultiplier = MIN(1.0 + (activeDaysThisWeek - 1) × 0.1, 2.0)
(activeDays = days with at least one verified post this week)

integrityBonus = COUNT(DietCard where classification = CLEAN this week) × 50

cheatPenalty = COUNT(DietCard where classification = CHEAT this week) × (baseCalories × 0.10 / cheatCount)

finalScore = (baseCalories × consistencyMultiplier) + integrityBonus - cheatPenalty

Store finalScore in Redis sorted set "lb:calorie:{year}-{week}" with userId as member.

LEADERBOARD SCREEN (app/(tabs)/leaderboard.tsx)

Six tabs using a scrollable top tab navigator:
1. Calorie King — sorted by finalScore descending
2. Grind Streak — sorted by streakDays descending
3. Pace God — sorted by AVG(avgPaceMinPerKm) ascending, min 3 runs this week
4. Distance Destroyer — sorted by SUM(distanceKm) descending this week
5. Integrity Champion — sorted by integrityPoints descending (all-time)
6. Clan Wars — sorted by clan combined score + territory count

Each leaderboard row:
- Rank number (gold #D4AF37 / silver #C0C0C0 / bronze #CD7F32 for top 3, bold)
- Avatar (28px)
- Name + clan tag badge
- Score value with unit
- "YOU" highlight pill if current user
- Delta arrow vs last week (up/down/same)

Clan Wars tab shows: clan color dot, tag badge, name, member count, combined score, zones held count.

BACKEND ENDPOINTS:

GET /api/leaderboards/calories?week= — check Redis first, build from DB if cache miss, cache for 5 minutes
GET /api/leaderboards/streak — from DB (User.streakDays)
GET /api/leaderboards/pace — DB query, weekly
GET /api/leaderboards/distance — Redis sorted set "lb:distance:{year}-{week}"
GET /api/leaderboards/integrity — from DB (User.integrityPoints all-time)
GET /api/leaderboards/clans — aggregate from DB

STREAK CALCULATION (BullMQ daily job at 23:59):
For each user: if they have a verified post today → User.streakDays++. Else: User.streakDays = 0.
This runs every night. Update streakDays on User model.

BULMQ CRON JOBS:

weeklyLeaderboardReset (Monday 00:00):
- Delete Redis keys: lb:calorie:{year}-{week}, lb:distance:{year}-{week}
- Insert into LeaderboardHistory (top 3 users per category for the week)
- Reset Territory.weeklyCalorieScore for all zones to 0
- Log reset

dailyStreakCheck (every day 23:59):
- For each active user: check if they have a post today
- Update streakDays accordingly

challengeExpiry (every hour):
- PENDING attacks older than 48 hours with no response → set EXPIRED, territory stays with defender, notify both

HALL OF FAME:
Add LeaderboardHistory model: id, week, category, userId, score, rank, createdAt
Monthly hall-of-fame screen shows top 3 per category per month.
```

---

### PROMPT 08 — Clan System

```
Build the complete clan system for ICHOR.

PRISMA ADDITIONS:
Add dietPactDescription (optional String) to Clan.
Add LeaderboardHistory model: id, week(String), category(String), userId(FK), score(Float), rank(Int), createdAt.

SCREENS:

app/clans/index.tsx:
- Search bar to find clans by name or 4-char tag
- List of top 10 clans by score with: color badge, tag, name, member count, score
- "Create Clan" button (only if user is not in a clan)
- "My Clan" button if user is in a clan

app/clans/create.tsx:
- Name input (max 30 chars)
- Tag input (exactly 4 chars, auto-uppercase, unique check on blur)
- Color picker (8 preset colors matching brand palette)
- Diet Pact field: optional challenge text e.g. "No sugar this week"
- Submit: POST /api/clans

app/clans/[id].tsx:
- Header: clan color banner, tag badge, name, member count, score
- Diet Pact card (if set)
- Member list: avatar, name, role badge (LEADER/MEMBER), their weekly score
- Territory section: shows all zones owned by clan members on a mini map
- Clan Wars: list of active attacks involving clan members
- Action buttons based on role: 
  - Leader: Edit Clan, Kick Member
  - Member: Leave Clan
  - Non-member: Join Clan button

BUSINESS RULES:
- Max 10 members per clan
- Joining leaves old clan (confirmation dialog required)
- Leaving: if leader, oldest member by joinedAt becomes leader automatically
- Kicking: leader only, cannot kick self

BACKEND ENDPOINTS:

POST /api/clans: create, set creator as LEADER, add ClanMember record
GET /api/clans: top 20 clans sorted by score
GET /api/clans/search?q=: search by name or tag
GET /api/clans/:id: clan detail — members with stats, territory zones, active attacks
POST /api/clans/:id/join: join (check max 10, remove from old clan first)
POST /api/clans/:id/leave: leave (promote next leader if leaving leader)
DELETE /api/clans/:id/members/:userId: kick (leader only, Zod validate)
PATCH /api/clans/:id: update name, tag, color, dietPactDescription (leader only)

CLAN SCORE CALCULATION:
Clan score = SUM(finalScore of all members this week) + (zones owned × 200 bonus)
Cache in Redis: "clan:score:{clanId}:{year}-{week}", TTL 10 minutes.
```

---

### PROMPT 09 — Gemini AI Features

```
Implement all three Gemini AI features for ICHOR.

Create services/geminiService.ts:
- Initialize @google/generative-ai with GEMINI_API_KEY
- Export three functions: chat(), parseScreenshot(), analyzeDiet()

FEATURE 1 — AI COACH "DHRUV" (app/coach.tsx)

Chat UI:
- Inverted FlatList (newest at bottom)
- User messages: right-aligned, crimson #C41E3A bubble
- Dhruv messages: left-aligned, #1A1A1A bubble, "D" avatar
- Typing indicator: three animated dots (Reanimated 3 loop animation)
- KeyboardAvoidingView input bar, send button
- Starter chips before first message:
  "How do I burn more calories?"
  "Analyze my week"
  "Help me beat [rival name]'s score"
  "Generate my training plan"
  "Should I accept this challenge?"

Backend: POST /api/coach/chat
1. Fetch last 30 days of user workouts: distanceKm, caloriesBurned, activityType, workoutDate
2. Fetch streak, integrityPoints, battlesWon, battlesLost, territory zones held
3. Build system prompt:
"You are Dhruv, the AI performance coach for ICHOR — a campus social fitness battleground. You are intense, motivating, and data-driven. Keep responses short (2-3 sentences max per point), mobile-optimized, no markdown headers. User stats: [weekly summary]. Territory: [zones held]. Battles: [won/lost]. Help them dominate the leaderboard."
4. Call gemini-1.5-flash with conversation history + new message, temperature 0.8, maxOutputTokens 400
5. Return { reply }

FEATURE 2 — SCREENSHOT OCR (POST /api/workouts/ocr)

Already scaffolded in Prompt 04 but finalize here with robust prompt engineering:

Gemini system prompt:
"You are a fitness data extraction AI. You will receive a screenshot from a fitness app (Strava, RunKeeper, Garmin, Nike Run Club, Apple Fitness, Samsung Health, or similar). Extract the workout metrics. Return ONLY a raw JSON object with no markdown formatting, no explanation. Schema: { activityType: 'RUN'|'WALK'|'CYCLE', distanceKm: number, durationSeconds: number, avgPaceMinPerKm: number|null, caloriesBurned: number, heartRateAvg: number|null, workoutDate: 'YYYY-MM-DD' }. If any field is not visible in the screenshot, use null. Do not guess."

Error handling: if Gemini returns unparseable JSON or all nulls, return { error: "Could not extract data. Please enter manually." } and show manual form.

FEATURE 3 — DIET ANALYZER (POST /api/coach/diet-analyze)

Request: { description: string } (free text from user)

Gemini prompt:
"You are a sports nutritionist AI. The user describes what they ate today. Classify their diet and return ONLY a raw JSON object: { classification: 'CLEAN'|'CHEAT'|'NEUTRAL', estimatedCalories: number, integrityBonus: number, suggestion: string (max 15 words) }. CLEAN = mostly healthy whole foods, gives integrityBonus 50. CHEAT = junk food, fried food, excessive sugar, gives integrityBonus 0. NEUTRAL = mixed or insufficient info, gives integrityBonus 25. EstimatedCalories is total food intake estimate."

Frontend: display result as a card in post composer before user confirms attaching it to the post.

FEATURE 4 — WEEKLY TRAINING PLAN (POST /api/coach/training-plan)

Analyze last 4 weeks of workouts: frequency, average distance, calorie trend.
Gemini prompt for structured JSON output:
"Generate a 7-day training plan for a college athlete. Return ONLY a JSON array: [{ day: string, type: 'Rest'|'Easy'|'Tempo'|'Long'|'Sprint'|'Cross-train', distanceKm: number|null, targetCalories: number, notes: string (max 20 words) }]. Base it on this recent workout data: [summary]."
Display as a horizontal week scroll card in profile screen.
```

---

### PROMPT 10 — Push Notifications + All BullMQ Jobs

```
Build the complete notification system and all background job infrastructure for ICHOR.

FCM SETUP:
- firebase-admin initialized with FIREBASE_SERVICE_ACCOUNT_JSON
- Create services/notificationService.ts with sendPush(userId, { title, body, data })
- Fetch user fcmToken from DB, skip silently if null
- All data objects include deepLink for Expo Router navigation

Frontend token registration (hooks/usePushToken.ts):
- On app launch post-login: request notification permissions via expo-notifications
- Get Expo push token
- PATCH /api/users/fcm-token with token
- Set foreground notification handler: show in-app toast instead of system banner

NOTIFICATION TYPES (implement all 8):

1. ZONE_CHALLENGED: "⚔️ Zone Under Attack" — "[Name] is challenging your [Zone Name]!" — deepLink: /map
2. CHALLENGE_ACCEPTED: "🔥 Challenge Accepted" — "[Name] accepted your zone challenge." — deepLink: /map
3. ZONE_LOST: "💥 Zone Lost" — "[Name] claimed [Zone Name]. Time to reclaim it." — deepLink: /map
4. ZONE_CLAIMED: "🏆 New Territory" — "You claimed [Zone Name]!" — deepLink: /map
5. KUDOS_RECEIVED: "👊 Kudos" — "[Name] sent you kudos on your [distance]km workout." — deepLink: /feed
6. CHALLENGE_EXPIRING: "⏰ Challenge Expiring" — "Your challenge for [Zone Name] expires in 24 hours." — deepLink: /map
7. STREAK_REMINDER: "🔥 Keep your streak alive!" — "Post today's workout to keep your [N]-day streak." — deepLink: /import
8. CLAN_WAR_UPDATE: "⚔️ Clan Alert" — "[Clan] is attacking your clan's territory!" — deepLink: /clans/[id]

BULMQ JOB REGISTRY (workers/index.ts):

Register all workers:

Job 1: processTerritoryClaimJob
- Triggered after POST /api/posts with locationZoneId
- Calls claimZone(userId, zoneId, calorieScore)
- Sends appropriate FCM if attack triggered

Job 2: challengeExpiryJob (cron: every hour)
- PENDING attacks older than 48 hours → set EXPIRED
- Territory stays with defender
- Notify both attacker and defender

Job 3: weeklyLeaderboardResetJob (cron: Monday 00:00)
- Save top 3 per category to LeaderboardHistory
- Delete Redis leaderboard keys
- Reset Territory.weeklyCalorieScore to 0 for all zones

Job 4: dailyStreakJob (cron: 23:59 every day)
- For each user with at least one post ever: check if they posted today
- If yes: increment streakDays
- If no: reset streakDays to 0
- If streakDays > 0 and no post today: send STREAK_REMINDER push at 20:00 instead (add separate cron at 20:00)

Job 5: streakReminderJob (cron: 20:00 every day)
- Find users with streakDays >= 3 and no post today
- Send STREAK_REMINDER push notification

Job 6: clanScoreCacheJob (cron: every 30 minutes)
- Recalculate and cache all clan scores in Redis

All jobs: retry 3 times with exponential backoff. Log completion time and count processed.

DEEP LINK HANDLING:
In app/_layout.tsx: use expo-notifications lastNotificationResponse listener.
Parse data.deepLink from notification and navigate with Expo Router.
```

---

### PROMPT 11 — Profile + Polish + Admin

```
Build the user profile screen, polish the full app, and add the admin layer.

PROFILE SCREEN (app/(tabs)/profile.tsx)

Sections top to bottom:

1. Hero header: large avatar, name, clan tag badge (colour-coded), "Edit Profile" button
2. Stats row: 4 chips — Total km | Total Workouts | Total Calories | Zones Held
3. Battle record: Wins vs Losses with a simple ratio bar
4. Streak section: current streak days (large number + flame icon), "Personal Best" streak
5. Integrity score: integrityPoints with a tier label (Honest Athlete / Committed / Champion)
6. Weekly Training Plan card: horizontal 7-day scroll from Gemini (POST /api/coach/training-plan on load if none cached)
7. Activity heatmap: GitHub-style 52-week grid, each cell = calories burned that day (color intensity from 0 to max)
8. Badges section: horizontal scroll of earned badges (icon + name)
9. My Posts: grid of activity card thumbnails (tap to open full post)

BADGE SYSTEM (backend): 
Award badges on these triggers — check and award in background after relevant actions:
- First Workout: posted first workout
- Streak 7: 7-day streak
- Streak 30: 30-day streak  
- Calorie King: finished #1 on weekly calorie leaderboard
- Conqueror: held 5+ zones simultaneously
- Integrity Champion: 30 consecutive diet logs all CLEAN
- Battle Hardened: 10 battles won

Store badges in UserBadge model: userId, badgeName, awardedAt.

ADMIN DASHBOARD (web — separate Express route group /admin):

Protect with a hardcoded ADMIN_SECRET header check (simple for now).

Pages (return JSON for a simple web UI):
- GET /admin/flagged-posts: posts with flagCount >= 3, include screenshot URL and reporter count
- POST /admin/posts/:id/restore: reset flagCount, set verificationStatus VERIFIED
- POST /admin/posts/:id/remove: delete post and associated workout
- GET /admin/zones: list all campus zones with territory info
- POST /admin/zones: create new campus zone with polygon (GeoJSON input)
- GET /admin/stats: total users, posts today, workouts this week, active clan count

GENERAL POLISH:

Error boundaries: wrap all tab screens in ErrorBoundary components
Loading skeletons: every list and card should show skeleton placeholders while loading (use a shimmer animation via Reanimated)
Empty states: every screen with a list needs a designed empty state (icon + message + action button)
Haptic feedback: on flame rating tap, on kudos tap, on challenge confirm — use expo-haptics
Offline banner: detect network state with @react-native-community/netinfo, show red banner when offline
Image caching: use expo-image instead of Image for automatic disk caching

SENTRY INTEGRATION:
- Install @sentry/react-native
- Initialize in app/_layout.tsx with SENTRY_DSN
- Wrap root with Sentry.wrap()
- Add Sentry.captureException in all catch blocks

POSTHOG ANALYTICS:
- Install posthog-react-native
- Track events: workout_imported, post_created, flame_rated, challenge_sent, challenge_responded, zone_claimed, ai_coach_opened, leaderboard_viewed
```

---

*End of ICHOR PRD and Antigravity Build Guide*  
*App: ICHOR | Version: 1.0 | Stack: Expo + Node.js + PostGIS + Gemini*