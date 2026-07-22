"use client";

/**
 * Internal showcase of the level-badge system and the clan-network visualization — every
 * territory/clan level 1-10 side by side, plus a mocked "clan empire" network. Not linked
 * anywhere; visit directly. Safe to delete once the visual system is settled.
 */

import { LevelBadge } from "@/components/ui/LevelBadge";
import { territoryLevel, clanLevel } from "@/lib/leveling";

// Exact [minVisits, minFame] pairs from lib/leveling.ts's TERRITORY_THRESHOLDS — feeding a
// level's own threshold back into territoryLevel() reproduces that exact level for the demo.
const LEVEL_INPUTS: [visits: number, fame: number][] = [
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

function BadgeCard({ level }: { level: number }) {
  const [visits, fame] = LEVEL_INPUTS[level - 1];
  const tier = territoryLevel({ totalVisits: visits, fameScore: fame });
  return (
    <div className="flex flex-col items-center gap-2 bg-midnight-raised border border-border-ichor rounded-xl px-3 py-4 min-w-[92px]">
      <LevelBadge tier={tier} />
      <div className="text-center">
        <div className="text-xs font-semibold">{tier.name}</div>
        <div className="text-[10px] text-white/40">Level {tier.level}</div>
      </div>
    </div>
  );
}

export default function DebugLevelsPage() {
  const clanTier = clanLevel({ totalKm: 3200, territoriesHeld: 62 });

  return (
    <div
      className="min-h-screen -mx-4 px-4 py-8"
      style={{
        backgroundColor: "#0D0D0D",
        backgroundImage:
          "linear-gradient(rgba(174,147,244,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(174,147,244,0.08) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display italic font-bold text-3xl text-white mb-1">Level system debug</h1>
        <p className="text-xs text-white/40 mb-8">Territory levels 1-10, clan levels, and the clan-network visualization.</p>

        <h2 className="text-sm font-semibold text-white/60 mb-3">Territory levels 1-5</h2>
        <div className="flex flex-wrap gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((l) => (
            <BadgeCard key={l} level={l} />
          ))}
        </div>

        <h2 className="text-sm font-semibold text-white/60 mb-3">Territory levels 6-10</h2>
        <div className="flex flex-wrap gap-3 mb-8">
          {[6, 7, 8, 9, 10].map((l) => (
            <BadgeCard key={l} level={l} />
          ))}
        </div>

        <h2 className="text-sm font-semibold text-white/60 mb-3">Clan level (sample)</h2>
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex flex-col items-center gap-2 bg-midnight-raised border border-border-ichor rounded-xl px-3 py-4 min-w-[92px]">
            <LevelBadge tier={clanTier} isOwnedByClan clanColor="#AE93F4" />
            <div className="text-center">
              <div className="text-xs font-semibold">{clanTier.name}</div>
              <div className="text-[10px] text-white/40">Level {clanTier.level}</div>
            </div>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-white/60 mb-3">Clan empire network (mock)</h2>
        <p className="text-xs text-white/40 mb-3">
          Five dummy nodes, hub-and-spoke, glowing — the same rendering used on the real Clan map and Empire page.
        </p>
        <NetworkMock />
      </div>
    </div>
  );
}

/** Static SVG mock of the hub-and-spoke network — same double-line glow trick as
 * ClanNetworkLayer (react-leaflet), reimplemented in plain SVG so this page needs no map. */
function NetworkMock() {
  const hub = { x: 300, y: 150 };
  const nodes = [
    { x: 80, y: 60 },
    { x: 480, y: 50 },
    { x: 520, y: 220 },
    { x: 260, y: 260 },
    { x: 100, y: 210 },
  ];
  const color = "#AE93F4";

  return (
    <div className="rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden">
      <svg viewBox="0 0 600 300" className="w-full h-auto">
        {nodes.map((n, i) => (
          <line key={`glow-${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} stroke={color} strokeWidth={10} opacity={0.18} />
        ))}
        {nodes.map((n, i) => (
          <line key={`line-${i}`} x1={hub.x} y1={hub.y} x2={n.x} y2={n.y} stroke={color} strokeWidth={2} opacity={0.85} />
        ))}
        <circle cx={hub.x} cy={hub.y} r={10} fill="#1A1A1A" stroke={color} strokeWidth={3} />
        {nodes.map((n, i) => (
          <circle key={`node-${i}`} cx={n.x} cy={n.y} r={7} fill="#1A1A1A" stroke={color} strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}
