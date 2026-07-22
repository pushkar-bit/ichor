"use client";

/**
 * DEV-ONLY visual demo of the territory UI/UX pass. Not linked anywhere and not under a
 * proxy.ts protected prefix, so it renders without auth or seeded data — it mounts the REAL
 * updated components (BattleRespondSheet, BattleRevealCard, Countdown, LeafletTerritoryMap)
 * with fixture props so every battle state can be seen at once. Safe to delete.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { Crown, Flame, ShieldAlert, Swords, Footprints, EyeOff, Shield, Info, HelpCircle, X, Hourglass, Timer } from "lucide-react";
import {
  BattleRespondSheet,
  BattleRevealCard,
  type BattleListItem,
} from "@/components/features/BattleSheets";
import { Countdown } from "@/components/features/Countdown";
import type { MapTerritory } from "@/components/features/TerritoryMap";

const TerritoryOnlyMap = dynamic(
  () => import("@/components/features/TerritoryOnlyMap").then((m) => m.TerritoryOnlyMap),
  { ssr: false },
);
const ClanMap = dynamic(() => import("@/components/features/ClanMap").then((m) => m.ClanMap), { ssr: false });
const LeafletTerritoryMap = dynamic(
  () => import("@/components/features/LeafletTerritoryMap").then((m) => m.LeafletTerritoryMap),
  { ssr: false, loading: () => <div className="w-full h-full skeleton" /> },
);

const ME = "me";
const inHours = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();

// ---- fixture geometry: a square territory + the strip an attacker's corridor took ----
function square(lng: number, lat: number, size: number): [number, number][][] {
  return [[
    [lng, lat],
    [lng + size, lat],
    [lng + size, lat + size],
    [lng, lat + size],
    [lng, lat],
  ]];
}
const TERRITORY_GEO = { type: "Polygon" as const, coordinates: square(77.20, 28.610, 0.005) };
const CORRIDOR_GEO = {
  type: "Polygon" as const,
  coordinates: [[
    [77.2005, 28.610],
    [77.2022, 28.610],
    [77.2022, 28.615],
    [77.2005, 28.615],
    [77.2005, 28.610],
  ]] as [number, number][][],
};

function mapTerritory(over: Partial<MapTerritory> & Pick<MapTerritory, "id" | "name" | "color">): MapTerritory {
  const base = over.geometry ?? { type: "Polygon" as const, coordinates: square(77.20, 28.61, 0.004) };
  const ring = base.type === "Polygon" ? base.coordinates[0] : base.coordinates[0][0];
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    geometry: base,
    centroid: { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 },
    bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    areaSqM: 180000,
    valuePoints: 1000,
    fameScore: 42,
    totalVisits: 6,
    totalDistanceKm: 12.4,
    shieldUntil: null,
    createdAt: inHours(-100),
    ownerId: "x",
    ownerName: "Rival",
    ownerAvatarUrl: null,
    isMine: false,
    ownerClanId: null,
    ownerClanName: null,
    ownerClanTag: null,
    ownerClanColor: null,
    ...over,
  };
}

const DEMO_TERRITORIES: MapTerritory[] = [
  mapTerritory({
    id: "t-mine",
    name: "Your Ridge Loop",
    color: "#D7F24C",
    isMine: true,
    ownerName: "You",
    ownerClanId: "c-iron",
    ownerClanName: "Iron Lungs",
    ownerClanTag: "IRON",
    ownerClanColor: "#D7F24C",
    geometry: { type: "Polygon", coordinates: square(77.196, 28.611, 0.004) },
  }),
  mapTerritory({
    id: "t-rival",
    name: "Nehru Park",
    color: "#4CC9F0",
    ownerClanId: "c-pace",
    ownerClanName: "Pace Setters",
    ownerClanTag: "PACE",
    ownerClanColor: "#4CC9F0",
    geometry: { type: "Polygon", coordinates: square(77.201, 28.611, 0.004) },
  }),
  mapTerritory({
    id: "t-shield",
    name: "Lodhi Stretch",
    color: "#F72585",
    shieldUntil: inHours(20),
    ownerClanId: "c-pace",
    ownerClanName: "Pace Setters",
    ownerClanTag: "PACE",
    ownerClanColor: "#4CC9F0",
    geometry: { type: "Polygon", coordinates: square(77.196, 28.606, 0.004) },
  }),
  mapTerritory({ id: "t-attack", name: "Canal Road", color: "#FF6B6B", geometry: { type: "Polygon", coordinates: square(77.201, 28.606, 0.004) } }),
];
const UNDER_ATTACK = new Set(["t-attack"]);

// ---- fixture battles ----
const opp = { id: "x", name: "Aarav", avatarUrl: "" };
const pendingBattle: BattleListItem = {
  id: "b-pending", role: "defender", status: "PENDING_RESPONSE", mode: null,
  territory: { id: "t-mine", name: "Your Ridge Loop", color: "#D7F24C" }, opponent: opp,
  proposedMetric: "PACE", respondBy: inHours(41), asyncMetric: null, asyncDeadline: null,
  duelMetric: null, duelWindowStart: null, duelWindowEnd: null,
  iHaveSubmitted: false, opponentHasSubmitted: false, resolution: null, winnerId: null,
  revealedStats: null, myPointsDelta: null, revealGeometry: null, createdAt: inHours(-7),
};
function resolved(over: Partial<BattleListItem>): BattleListItem {
  return {
    id: "b", role: "attacker", status: "RESOLVED", mode: "ASYNC",
    territory: { id: "t-rival", name: "Nehru Park", color: "#4CC9F0" }, opponent: opp,
    proposedMetric: "PACE", respondBy: inHours(-40), asyncMetric: "PACE", asyncDeadline: inHours(-2),
    duelMetric: null, duelWindowStart: null, duelWindowEnd: null,
    iHaveSubmitted: true, opponentHasSubmitted: true,
    resolution: "ATTACKER_WIN", winnerId: ME,
    revealedStats: {
      attacker: { distanceKm: 5.4, avgPaceMinPerKm: 4.9, durationSeconds: 1590 },
      defender: { distanceKm: 5.1, avgPaceMinPerKm: 5.3, durationSeconds: 1620 },
    },
    myPointsDelta: 100, revealGeometry: { territory: TERRITORY_GEO, corridor: CORRIDOR_GEO }, createdAt: inHours(-52),
    ...over,
  };
}
const victoryBattle = resolved({ id: "b-win" });
const splitBattle = resolved({
  id: "b-split", mode: "REFUSED", resolution: "SPLIT", winnerId: null, myPointsDelta: -25,
});
const repelledBattle = resolved({
  id: "b-repel", mode: "REFUSED", resolution: "DEFENDER_WIN", winnerId: "x", role: "attacker", myPointsDelta: -75,
});
const forfeitBattle = resolved({
  id: "b-forfeit", mode: "DUEL", resolution: "DOUBLE_FORFEIT", winnerId: null, myPointsDelta: -50,
  iHaveSubmitted: false, opponentHasSubmitted: false,
  revealedStats: { attacker: { distanceKm: null, avgPaceMinPerKm: null, durationSeconds: null }, defender: { distanceKm: null, avgPaceMinPerKm: null, durationSeconds: null } },
  revealGeometry: null,
});

export default function TerritoryDemoPage() {
  const [overlay, setOverlay] = useState<null | "respond" | "win" | "split" | "repel" | "forfeit" | "rules">(null);

  const DemoBtn = ({ id, children }: { id: NonNullable<typeof overlay>; children: React.ReactNode }) => (
    <button
      onClick={() => setOverlay(id)}
      className="inline-flex items-center gap-2 bg-white/10 border-2 border-border-ichor text-sm font-semibold px-3.5 py-2 rounded-none hover:bg-white/15"
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-white">
      <h1 className="font-display italic font-bold text-3xl mb-1">Territory UI/UX demo</h1>
      <p className="text-xs text-white/40 mb-6">Real components, fixture data. Every battle state in one place.</p>

      {/* 1 — Map state legibility + legend */}
      <h2 className="text-sm font-semibold text-white/60 mb-2">1 · Map states &amp; legend</h2>
      <div className="relative w-full aspect-square max-w-md rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden">
        <LeafletTerritoryMap territories={DEMO_TERRITORIES} onTerritoryClick={() => {}} underAttackIds={UNDER_ATTACK} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/50 mb-8">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-white bg-white/30 inline-block" /> Yours</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white/20 border border-white/40 inline-block" /> Rivals</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-dashed border-white/60 inline-block" /> Shielded</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-dotted border-ignite inline-block" /> Under attack</span>
      </div>

      {/* 1b — Territories-only view (no street tiles) */}
      <h2 className="text-sm font-semibold text-white/60 mb-2">1b · Territories-only view</h2>
      <div className="relative w-full aspect-square max-w-md rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden mb-8">
        <TerritoryOnlyMap territories={DEMO_TERRITORIES} onTerritoryClick={() => {}} underAttackIds={UNDER_ATTACK} />
      </div>

      {/* 1c — Clan territories view */}
      <h2 className="text-sm font-semibold text-white/60 mb-2">1c · Clan territories view</h2>
      <div className="relative w-full aspect-square max-w-md rounded-2xl border border-border-ichor bg-midnight-raised overflow-hidden mb-8">
        <ClanMap territories={DEMO_TERRITORIES} onTerritoryClick={() => {}} />
      </div>

      {/* 2 — Live countdowns */}
      <h2 className="text-sm font-semibold text-white/60 mb-2">2 · Live countdowns (tick every second)</h2>
      <div className="flex flex-wrap gap-3 text-sm mb-8">
        <span className="bg-white/5 rounded-lg px-3 py-2 inline-flex items-center gap-1.5"><Hourglass className="w-4 h-4 text-white/40" /> Respond: <Countdown to={inHours(41)} suffix=" left" /></span>
        <span className="bg-ignite/10 border border-ignite/25 rounded-lg px-3 py-2 inline-flex items-center gap-1.5"><Timer className="w-4 h-4 text-ignite" /> Duel window: <Countdown to={inHours(0.6)} suffix=" left" /></span>
        <span className="bg-white/5 rounded-lg px-3 py-2 inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-momentum" /> Shield: <Countdown to={inHours(20)} suffix=" left" /></span>
        <span className="bg-white/5 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">Expired: <Countdown to={inHours(-1)} suffix=" left" expiredText="resolving…" /></span>
      </div>

      {/* 3 — Interactive sheets */}
      <h2 className="text-sm font-semibold text-white/60 mb-2">3 · Sheets &amp; cards — click to open</h2>
      <div className="flex flex-wrap gap-2.5 mb-10">
        <DemoBtn id="respond"><Swords className="w-4 h-4 text-ignite" /> Respond (preview + duel scheduler)</DemoBtn>
        <DemoBtn id="win"><Crown className="w-4 h-4 text-lime" /> Reveal: Victory</DemoBtn>
        <DemoBtn id="split"><Swords className="w-4 h-4 text-momentum" /> Reveal: Split</DemoBtn>
        <DemoBtn id="repel"><Shield className="w-4 h-4 text-ignite" /> Reveal: Repelled</DemoBtn>
        <DemoBtn id="forfeit"><EyeOff className="w-4 h-4 text-white/50" /> Reveal: Forfeit</DemoBtn>
        <DemoBtn id="rules"><HelpCircle className="w-4 h-4 text-momentum" /> Rules onboarding</DemoBtn>
      </div>

      {overlay === "respond" && <BattleRespondSheet battle={pendingBattle} currentUserId={ME} onClose={() => setOverlay(null)} onResponded={() => setOverlay(null)} />}
      {overlay === "win" && <BattleRevealCard battle={victoryBattle} currentUserId={ME} onClose={() => setOverlay(null)} />}
      {overlay === "split" && <BattleRevealCard battle={splitBattle} currentUserId={ME} onClose={() => setOverlay(null)} />}
      {overlay === "repel" && <BattleRevealCard battle={repelledBattle} currentUserId={ME} onClose={() => setOverlay(null)} />}
      {overlay === "forfeit" && <BattleRevealCard battle={forfeitBattle} currentUserId={ME} onClose={() => setOverlay(null)} />}

      {overlay === "rules" && (
        <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60" onClick={() => setOverlay(null)}>
          <div className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg inline-flex items-center gap-2"><Info className="w-5 h-5 text-momentum" /> How territory works</h2>
              <button onClick={() => setOverlay(null)}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <div className="space-y-3.5 text-sm text-white/70">
              <div className="flex gap-3"><Footprints className="w-5 h-5 text-momentum shrink-0 mt-0.5" /><p><b className="text-white">Run to claim.</b> Any GPS-verified run over 2km turns the unclaimed ground it covers into your territory — automatically.</p></div>
              <div className="flex gap-3"><Swords className="w-5 h-5 text-ignite shrink-0 mt-0.5" /><p><b className="text-white">Cover 6% to attack.</b> Match the territory&apos;s claim distance (capped at 3km) and cover 6%+ of its land in a single run to challenge its owner — on pace or on distance.</p></div>
              <div className="flex gap-3"><EyeOff className="w-5 h-5 text-white/50 shrink-0 mt-0.5" /><p><b className="text-white">Fog of war.</b> Neither side sees the other&apos;s run until the battle resolves.</p></div>
              <div className="flex gap-3"><Shield className="w-5 h-5 text-momentum shrink-0 mt-0.5" /><p><b className="text-white">Defenders choose.</b> Accept a challenge or duel — best run wins the land. Refuse, and only a run that beats your claim carves off ground.</p></div>
              <div className="flex gap-3"><Flame className="w-5 h-5 text-ignite shrink-0 mt-0.5" /><p><b className="text-white">Fame is separate.</b> Every run through a piece of land makes it more famous, whoever owns it.</p></div>
            </div>
            <button onClick={() => setOverlay(null)} className="w-full mt-5 bg-momentum text-midnight font-semibold py-3 rounded-none border-2 border-border-ichor">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
