/**
 * Dhaav — Complete Type System
 * All types derived from the PRD data models.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type SourceType = 'HEALTH_SYNC' | 'OCR_SCREENSHOT' | 'MANUAL';
export type ActivityType = 'RUN' | 'WALK' | 'CYCLE';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'FLAGGED';
export type DietClassification = 'CLEAN' | 'CHEAT' | 'NEUTRAL';
export type AttackStatus = 'PENDING' | 'ACCEPTED' | 'FORFEITED' | 'RESOLVED' | 'EXPIRED';
export type AttackType = 'STAT' | 'SPRINT';
export type ClanRole = 'LEADER' | 'MEMBER';
export type LeaderboardCategory =
  | 'CALORIES'
  | 'STREAK'
  | 'PACE'
  | 'DISTANCE'
  | 'INTEGRITY'
  | 'CLAN';

// ─── Core Models ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  clerkId?: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  fcmToken: string | null;
  totalDistanceKm: number;
  totalWorkouts: number;
  totalCalories: number;
  streakDays: number;
  integrityPoints: number;
  battlesWon: number;
  battlesLost: number;
  clanId: string | null;
  createdAt: string;
}

export interface Workout {
  id: string;
  userId: string;
  sourceType: SourceType;
  activityType: ActivityType;
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
  heartRateAvg: number | null;
  workoutDate: string;
  externalId: string | null;
  screenshotUrl: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface DietCard {
  id: string;
  postId: string;
  description: string;
  classification: DietClassification;
  estimatedCalories: number | null;
  integrityBonus: number;
  createdAt: string;
}

export interface FlameRating {
  id: string;
  postId: string;
  userId: string;
  rating: number; // 1–5
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  parentId: string | null;
  text: string;
  createdAt: string;
  replies?: Comment[];
}

export interface Post {
  id: string;
  userId: string;
  author: Pick<User, 'id' | 'name' | 'avatarUrl' | 'clanId'>;
  workoutId: string;
  workout: Workout;
  caption: string | null;
  photoUrls: string[];
  locationZoneId: string | null;
  locationZone: Pick<CampusZone, 'id' | 'name'> | null;
  isPublic: boolean;
  avgFlameRating: number;
  flameCount: number;
  kudosCount: number;
  flagCount: number;
  dietCard: DietCard | null;
  createdAt: string;
  // Client-side optimistic state
  userFlameRating?: number;
  hasGivenKudos?: boolean;
}

// ─── Territory ───────────────────────────────────────────────────────────────

export interface CampusZone {
  id: string;
  name: string;
  description: string | null;
  color: string;
  centroidLat: number;
  centroidLng: number;
  // GeoJSON polygon coordinates [[lng, lat], ...]
  polygon?: number[][];
  territory: Territory | null;
}

export interface Territory {
  id: string;
  zoneId: string;
  ownerId: string | null;
  owner: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
  clanId: string | null;
  clan: Pick<Clan, 'id' | 'name' | 'tag' | 'color'> | null;
  weeklyCalorieScore: number;
  acquiredAt: string | null;
  lastDefended: string | null;
}

export interface Attack {
  id: string;
  attackerId: string;
  attacker: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  defenderId: string;
  defender: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  zoneId: string;
  zone: Pick<CampusZone, 'id' | 'name'>;
  status: AttackStatus;
  type: AttackType;
  scheduledAt: string | null;
  resolvedAt: string | null;
  winnerId: string | null;
  createdAt: string;
}

// ─── Clans ───────────────────────────────────────────────────────────────────

export interface Clan {
  id: string;
  name: string;
  tag: string; // 4 chars
  leaderId: string;
  color: string;
  dietPactDescription: string | null;
  battlesWon: number;
  createdAt: string;
  members?: ClanMember[];
  memberCount?: number;
  weeklyScore?: number;
  zonesHeld?: number;
}

export interface ClanMember {
  clanId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl' | 'streakDays' | 'integrityPoints'>;
  role: ClanRole;
  joinedAt: string;
  weeklyScore?: number;
}

// ─── Leaderboards ────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  clanTag: string | null;
  clanColor: string | null;
  score: number;
  unit: string;
  deltaDirection: 'up' | 'down' | 'same';
  isCurrentUser: boolean;
}

export interface ClanLeaderboardEntry {
  rank: number;
  clanId: string;
  name: string;
  tag: string;
  color: string;
  memberCount: number;
  weeklyScore: number;
  zonesHeld: number;
}

export interface LeaderboardHistory {
  id: string;
  week: string;
  category: LeaderboardCategory;
  userId: string;
  score: number;
  rank: number;
  createdAt: string;
}

// ─── AI / Gemini ─────────────────────────────────────────────────────────────

export interface ExtractedWorkout {
  activityType: ActivityType;
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
  heartRateAvg: number | null;
  workoutDate: string; // YYYY-MM-DD
}

export interface DietAnalysisResult {
  classification: DietClassification;
  estimatedCalories: number;
  integrityBonus: number;
  suggestion: string;
}

export interface TrainingPlanDay {
  day: string;
  type: 'Rest' | 'Easy' | 'Tempo' | 'Long' | 'Sprint' | 'Cross-train';
  distanceKm: number | null;
  targetCalories: number;
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export type BadgeName =
  | 'FIRST_WORKOUT'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'CALORIE_KING'
  | 'CONQUEROR'
  | 'INTEGRITY_CHAMPION'
  | 'BATTLE_HARDENED';

export interface UserBadge {
  id: string;
  userId: string;
  badgeName: BadgeName;
  awardedAt: string;
}

// ─── API Response wrappers ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

// ─── Import / Post Draft ─────────────────────────────────────────────────────

export interface WorkoutDraft {
  workout: Workout;
  screenshotUrl?: string;
  source: SourceType;
}

export interface PostDraft {
  workout: Workout;
  photoUris: string[];
  caption: string;
  locationZoneId: string | null;
  dietCard: DietAnalysisResult | null;
  dietDescription: string;
  isPublic: boolean;
}
