/**
 * Dhaav — Format Utilities
 * Shared formatters used across the app for displaying workout stats.
 */

/**
 * Format seconds to human-readable duration.
 * e.g. 3661 → "1h 01m"  |  245 → "4m 05s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Format distance in km.
 * e.g. 5.234 → "5.23 km"
 */
export function formatDistance(km: number): string {
  return `${km.toFixed(2)} km`;
}

/**
 * Format pace in min/km.
 * e.g. 5.5 → "5:30 /km"
 */
export function formatPace(minPerKm: number | null | undefined): string {
  if (!minPerKm) return '—';
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')} /km`;
}

/**
 * Format calories.
 * e.g. 1234 → "1,234 kcal"
 */
export function formatCalories(kcal: number): string {
  return `${kcal.toLocaleString()} kcal`;
}

/**
 * Format relative time from ISO string.
 * e.g. "2h ago" | "just now" | "3d ago"
 */
export function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Format a week string for Redis keys.
 * e.g. "2026-W27"
 */
export function getWeekKey(date = new Date()): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Calculate leaderboard score from workout data.
 * finalScore = (baseCalories × consistencyMultiplier) + integrityBonus - cheatPenalty
 */
export function calculateLeaderboardScore(params: {
  baseCalories: number;
  activeDaysThisWeek: number;
  cleanDietCount: number;
  cheatDietCount: number;
}): number {
  const { baseCalories, activeDaysThisWeek, cleanDietCount, cheatDietCount } = params;

  const consistencyMultiplier = Math.min(1.0 + (activeDaysThisWeek - 1) * 0.1, 2.0);
  const integrityBonus = cleanDietCount * 50;
  const cheatPenalty = cheatDietCount * (baseCalories * 0.1 / Math.max(cheatDietCount, 1));

  return (baseCalories * consistencyMultiplier) + integrityBonus - cheatPenalty;
}
