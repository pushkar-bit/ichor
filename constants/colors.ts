/**
 * Dhaav Brand Color System
 * Primary: Purple #A855F7 (from ICHOR brandkit)
 * Background: Near-black #0D0D0D
 * Gold accents for leaderboard ranks
 */

export const Colors = {
  // Brand primaries
  primary: '#A855F7',
  primaryDark: '#7C3AED',
  primaryLight: '#C084FC',
  primaryMuted: 'rgba(168, 85, 247, 0.15)',

  // Backgrounds
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  surfaceHighlight: '#2E2E2E',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',

  // Borders
  border: '#333333',
  borderLight: '#444444',

  // Semantic
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Leaderboard ranks
  gold: '#D4AF37',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Activity types
  run: '#A855F7',
  walk: '#3B82F6',
  cycle: '#10B981',

  // Diet classifications
  clean: '#10B981',
  cheat: '#EF4444',
  neutral: '#A0A0A0',

  // Tab bar
  tabActive: '#A855F7',
  tabInactive: '#555555',
  tabBackground: '#111111',
  tabBorder: '#222222',

  // Flame rating
  flame: '#F97316',
  flameEmpty: '#333333',

  // Clan colors (preset palette)
  clanColors: [
    '#A855F7', // Purple (primary)
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#8B5CF6', // Violet
  ],
} as const;

export type ColorKey = keyof typeof Colors;
