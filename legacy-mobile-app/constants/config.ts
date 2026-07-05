/**
 * Dhaav App Configuration
 */

export const Config = {
  APP_NAME: 'Dhaav',
  APP_TAGLINE: 'Sprint. Post. Dominate.',

  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  ALLOWED_DOMAIN: process.env.EXPO_PUBLIC_ALLOWED_DOMAIN ?? '',

  // Feed
  FEED_PAGE_SIZE: 20,
  MAX_PHOTO_COUNT: 5,
  CAPTION_MAX_LENGTH: 300,

  // Scoring
  STREAK_MULTIPLIER_PER_DAY: 0.1,
  MAX_STREAK_MULTIPLIER: 2.0,
  INTEGRITY_BONUS_CLEAN: 50,
  INTEGRITY_BONUS_NEUTRAL: 25,
  CHEAT_PENALTY_PERCENT: 0.1,

  // Clan
  MAX_CLAN_MEMBERS: 10,
  CLAN_TAG_LENGTH: 4,
  CLAN_ZONE_BONUS: 200,

  // Attacks
  ATTACK_EXPIRY_HOURS: 48,
  FLAG_AUTO_HIDE_COUNT: 3,

  // Health Sync
  HEALTH_SYNC_DAYS: 7,

  // AI
  COACH_NAME: 'Dhruv',
  GEMINI_MODEL: 'gemini-1.5-flash',
} as const;
