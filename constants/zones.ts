/**
 * Dhaav Campus Zone Names
 * These are the predefined zone names shown in the location picker.
 * Actual polygon coordinates are seeded in the database by the admin.
 */

export const CAMPUS_ZONE_NAMES = [
  'Main Gate',
  'Library Zone',
  'Sports Complex',
  'Hostel Block A',
  'Hostel Block B',
  'Academic Block',
  'Canteen Area',
  'Running Track',
] as const;

export type CampusZoneName = (typeof CAMPUS_ZONE_NAMES)[number];

/**
 * Activity type display config
 */
export const ACTIVITY_TYPE_CONFIG = {
  RUN: {
    label: 'Run',
    icon: 'footprints',
    color: '#A855F7',
    emoji: '🏃',
  },
  WALK: {
    label: 'Walk',
    icon: 'person-walking',
    color: '#3B82F6',
    emoji: '🚶',
  },
  CYCLE: {
    label: 'Cycle',
    icon: 'bicycle',
    color: '#10B981',
    emoji: '🚴',
  },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPE_CONFIG;

/**
 * Diet classification display config
 */
export const DIET_CLASSIFICATION_CONFIG = {
  CLEAN: {
    label: 'Clean Eat',
    emoji: '🥗',
    color: '#10B981',
    description: 'Healthy whole foods',
  },
  CHEAT: {
    label: 'Cheat Day',
    emoji: '🍕',
    color: '#EF4444',
    description: 'Junk food logged',
  },
  NEUTRAL: {
    label: 'Mixed',
    emoji: '🍽️',
    color: '#A0A0A0',
    description: 'Mixed or partial info',
  },
} as const;

export type DietClassification = keyof typeof DIET_CLASSIFICATION_CONFIG;
