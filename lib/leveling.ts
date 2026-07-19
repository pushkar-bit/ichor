/**
 * Shared "level" derivation for territories and clans, purely a display concept layered on
 * top of existing stats (no new persisted fields) — mirrors the tier-from-score pattern
 * already used for user integrity in scoring.ts's integrityTier().
 */

export type LevelTier = { level: number; label: string; color: string };

const TIER_LABELS = ["Spark", "Spark", "Momentum", "Momentum", "Ignite", "Ignite", "Afterrun", "Afterrun", "Legend", "Legend"];
const TIER_COLORS = [
  "#6A8EAE",
  "#6A8EAE",
  "#AE93F4",
  "#AE93F4",
  "#FF5E1A",
  "#FF5E1A",
  "#FDA2DE",
  "#FDA2DE",
  "#D7F24C",
  "#D7F24C",
];

// Territory "power" = its ownership stake (valuePoints) plus how alive it is (fameScore,
// which itself already blends distinct runners, visits, and cumulative distance covered).
const TERRITORY_POWER_THRESHOLDS = [0, 150, 220, 320, 460, 650, 900, 1250, 1700, 2300];

// Clan "power" uses zonesHeld and memberCount rather than the weekly leaderboard score —
// a level shouldn't dip just because nobody happened to run this particular week.
const CLAN_POWER_THRESHOLDS = [0, 150, 300, 500, 750, 1050, 1400, 1800, 2300, 3000];

function levelFromThresholds(power: number, thresholds: number[]): number {
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (power >= thresholds[i]) level = i + 1;
  }
  return level;
}

function tierFor(level: number): LevelTier {
  const i = Math.min(Math.max(level, 1), TIER_LABELS.length) - 1;
  return { level, label: TIER_LABELS[i], color: TIER_COLORS[i] };
}

export function territoryLevel(t: { valuePoints: number; fameScore: number }): LevelTier {
  const power = t.valuePoints / 10 + t.fameScore;
  return tierFor(levelFromThresholds(power, TERRITORY_POWER_THRESHOLDS));
}

export function clanLevel(c: { zonesHeld: number; memberCount: number }): LevelTier {
  const power = c.zonesHeld * 100 + c.memberCount * 20;
  return tierFor(levelFromThresholds(power, CLAN_POWER_THRESHOLDS));
}
