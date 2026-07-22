/**
 * Level derivation for territories and clans, purely a display concept layered on top of
 * existing stats (no new persisted fields) — mirrors the tier-from-score pattern already
 * used for user integrity in scoring.ts's integrityTier().
 */

export type BadgeIcon = "swords" | "shield" | "flame" | "crown" | "burst";

export type LevelTier = {
  level: number;
  name: string;
  ringColor: string;
  ringWidth: number;
  size: number;
  glow: boolean;
  glowPx: number;
  pulse: boolean;
  icon: BadgeIcon;
};

/**
 * Visual band shared by territory and clan badges — level number maps to the same ring
 * color/size/icon/glow/pulse regardless of which formula produced the level, so a level-7
 * territory and a level-7 clan read as the same tier of "power" at a glance.
 */
const VISUAL_BANDS: Omit<LevelTier, "level" | "name">[] = [
  { ringColor: "#6B6570", ringWidth: 2, size: 32, glow: false, glowPx: 0, pulse: false, icon: "swords" }, // 1-2 Outpost
  { ringColor: "#9CA3AF", ringWidth: 2, size: 36, glow: false, glowPx: 0, pulse: false, icon: "shield" }, // 3-4 Settlement
  { ringColor: "#AE93F4", ringWidth: 3, size: 40, glow: true, glowPx: 8, pulse: false, icon: "flame" }, // 5-6 Fortress
  { ringColor: "#D4AF37", ringWidth: 3, size: 44, glow: true, glowPx: 12, pulse: false, icon: "crown" }, // 7-8 Dominion
  { ringColor: "#D4AF37", ringWidth: 4, size: 48, glow: true, glowPx: 16, pulse: true, icon: "burst" }, // 9-10 Eternal
];

function visualBandFor(level: number): Omit<LevelTier, "level" | "name"> {
  const clamped = Math.min(Math.max(level, 1), 10);
  return VISUAL_BANDS[Math.floor((clamped - 1) / 2)];
}

const TERRITORY_NAMES = [
  "Outpost",
  "Hamlet",
  "Settlement",
  "Stronghold",
  "Fortress",
  "Citadel",
  "Capital",
  "Dominion",
  "Legend",
  "Eternal",
];

// [minRuns, minFame] per level, 1-indexed. Both conditions must be met — the highest level
// where totalRuns and famousScore each clear that level's minimum wins.
const TERRITORY_THRESHOLDS: [minRuns: number, minFame: number][] = [
  [1, 1],
  [5, 3],
  [10, 6],
  [20, 11],
  [35, 21],
  [50, 36],
  [75, 56],
  [100, 81],
  [150, 121],
  [200, 171],
];

/** `totalRuns` maps to Territory.totalVisits, `famousScore` to Territory.fameScore — the two
 * real, already-tracked stats closest to what those names describe. */
export function territoryLevel(t: { totalVisits: number; fameScore: number }): LevelTier {
  let level = 1;
  for (let i = 0; i < TERRITORY_THRESHOLDS.length; i++) {
    const [minRuns, minFame] = TERRITORY_THRESHOLDS[i];
    if (t.totalVisits >= minRuns && t.fameScore >= minFame) level = i + 1;
  }
  return { level, name: TERRITORY_NAMES[level - 1], ...visualBandFor(level) };
}

const CLAN_NAMES = ["Tribe", "Warband", "Regiment", "Battalion", "Legion", "Army", "Empire", "Dominion", "Sovereign", "Eternal"];

// [minKm, minZones] per level 2-10 — level 1 is the floor (totalKm < 50 OR territoriesHeld < 2).
const CLAN_THRESHOLDS: [minKm: number, minZones: number][] = [
  [50, 2],
  [150, 5],
  [300, 10],
  [500, 15],
  [800, 20],
  [1200, 30],
  [2000, 45],
  [3000, 60],
  [5000, 80],
];

export function clanLevel(c: { totalKm: number; territoriesHeld: number }): LevelTier {
  let level = 1;
  if (c.totalKm >= 50 && c.territoriesHeld >= 2) {
    for (let i = 0; i < CLAN_THRESHOLDS.length; i++) {
      const [minKm, minZones] = CLAN_THRESHOLDS[i];
      if (c.totalKm >= minKm && c.territoriesHeld >= minZones) level = i + 2;
    }
  }
  return { level, name: CLAN_NAMES[level - 1], ...visualBandFor(level) };
}

/** `territoryLevel`/`clanLevel` already return `name` and `ringColor` on the tier object —
 * these standalone lookups exist for callers that only have a bare level number. */
export function getLevelName(level: number, kind: "territory" | "clan" = "territory"): string {
  const clamped = Math.min(Math.max(level, 1), 10);
  return (kind === "clan" ? CLAN_NAMES : TERRITORY_NAMES)[clamped - 1];
}

export function getLevelRingColor(level: number): string {
  return visualBandFor(level).ringColor;
}
