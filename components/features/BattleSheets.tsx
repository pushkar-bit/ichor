"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { X, Swords, Shield, Scissors, Timer, Footprints, EyeOff, Trophy, Loader2, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatPace, formatDuration, timeAgo } from "@/lib/utils";
import { Countdown } from "./Countdown";

type MiniGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type BattleListItem = {
  id: string;
  role: "attacker" | "defender";
  status: "PENDING_RESPONSE" | "ASYNC_ACTIVE" | "DUEL_SCHEDULED" | "RESOLVED";
  mode: "REFUSED" | "ASYNC" | "DUEL" | null;
  territory: { id: string; name: string; color: string } | null;
  opponent: { id: string; name: string; avatarUrl: string } | null;
  proposedMetric: "PACE" | "DISTANCE";
  respondBy: string | null;
  asyncMetric: "PACE" | "DISTANCE" | null;
  asyncDeadline: string | null;
  duelMetric: "PACE" | "DISTANCE" | null;
  duelWindowStart: string | null;
  duelWindowEnd: string | null;
  iHaveSubmitted: boolean;
  opponentHasSubmitted: boolean;
  resolution: "ATTACKER_WIN" | "DEFENDER_WIN" | "SPLIT" | "DOUBLE_FORFEIT" | null;
  winnerId: string | null;
  revealedStats: {
    attacker: { distanceKm: number | null; avgPaceMinPerKm: number | null; durationSeconds: number | null };
    defender: { distanceKm: number | null; avgPaceMinPerKm: number | null; durationSeconds: number | null };
  } | null;
  myPointsDelta: number | null;
  revealGeometry: { territory: MiniGeometry; corridor: MiniGeometry } | null;
  createdAt: string;
};

const shortTz =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? ""
    : "";

/** Flattens a Polygon/MultiPolygon to its rings for compact SVG rendering. */
function ringsOf(g: MiniGeometry): number[][][] {
  return g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
}

/**
 * The fog-of-war payoff, made visual: the attacker's corridor (ignite) laid over the contested
 * territory (its own color) in a tiny normalized SVG — "here's the strip they ran," at a glance.
 */
function CorridorMiniMap({ territory, corridor, color }: { territory: MiniGeometry; corridor: MiniGeometry; color: string }) {
  const tRings = ringsOf(territory);
  const cRings = ringsOf(corridor);
  const pts = [...tRings, ...cRings].flat();
  if (pts.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const w = maxX - minX || 1e-6;
  const h = maxY - minY || 1e-6;
  const VB = 100, pad = 8;
  const scale = Math.min((VB - 2 * pad) / w, (VB - 2 * pad) / h);
  const offX = (VB - w * scale) / 2;
  const offY = (VB - h * scale) / 2;
  const project = ([x, y]: number[]) => [offX + (x - minX) * scale, VB - (offY + (y - minY) * scale)];
  const toPath = (rings: number[][][]) =>
    rings.map((ring) => "M" + ring.map((p) => project(p).map((n) => n.toFixed(1)).join(",")).join("L") + "Z").join(" ");

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-32 rounded-lg bg-black/30" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <path d={toPath(tRings)} fill={color} fillOpacity={0.28} stroke={color} strokeWidth={0.8} />
      <path d={toPath(cRings)} fill="#FF5E1A" fillOpacity={0.4} stroke="#FF5E1A" strokeWidth={1} />
    </svg>
  );
}

function MetricPill({ metric }: { metric: "PACE" | "DISTANCE" }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded-full">
      {metric === "PACE" ? <Timer className="w-3 h-3" /> : <Footprints className="w-3 h-3" />}
      {metric === "PACE" ? "Pace (min 3km)" : "Distance (min 8km)"}
    </span>
  );
}

/** Defender's three-way choice for an incoming attack. */
export function BattleRespondSheet({
  battle,
  currentUserId,
  onClose,
  onResponded,
}: {
  battle: BattleListItem;
  currentUserId: string;
  onClose: () => void;
  onResponded: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duelOpen, setDuelOpen] = useState(false);
  const [duelMetric, setDuelMetric] = useState<"PACE" | "DISTANCE">(battle.proposedMetric);
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");

  // Mirror the server's duel-window rules so the picker can't offer an invalid slot.
  const DUEL_MIN_NOTICE_HOURS = 6;
  const DUEL_MAX_START_DAYS = 7;
  // Computed once at mount (lazy initializer) — never in the render body, which would recompute
  // the "now"-relative bounds unstably on every re-render.
  const [{ minStart, maxStart }] = useState(() => {
    const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    return {
      minStart: toLocalInput(new Date(Date.now() + DUEL_MIN_NOTICE_HOURS * 3600e3)),
      maxStart: toLocalInput(new Date(Date.now() + DUEL_MAX_START_DAYS * 86400e3)),
    };
  });
  const windowHours =
    windowStart && windowEnd ? (new Date(windowEnd).getTime() - new Date(windowStart).getTime()) / 3600e3 : null;
  const windowValid = windowHours != null && windowHours >= 1 && windowHours <= 24;

  async function respond(body: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/battles/${battle.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      onResponded();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg inline-flex items-center gap-2">
            <Swords className="w-5 h-5 text-ignite" /> Attack on {battle.territory?.name}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <Avatar src={battle.opponent?.avatarUrl} name={battle.opponent?.name ?? "?"} size={36} />
          <div className="text-sm">
            <span className="font-semibold">{battle.opponent?.name}</span> ran 40%+ of your land and attacked.
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-white/50 bg-white/5 rounded-xl p-3 mb-3">
          <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
          Fog of war: you can&apos;t see their run, they can&apos;t see yours. They proposed a{" "}
          {battle.proposedMetric.toLowerCase()} battle.
        </div>

        {battle.respondBy && (
          <div className="flex items-center gap-2 text-xs bg-ignite/10 border border-ignite/25 rounded-xl px-3 py-2 mb-3">
            <Clock className="w-4 h-4 text-ignite shrink-0" />
            <span className="text-white/70">
              <Countdown to={battle.respondBy} suffix=" left to respond" expiredText="time's up — resolving…" /> · silence
              splits the land only if their run beat yours.
            </span>
          </div>
        )}

        {/* What each choice actually does — decided under fog, so framed conditionally. */}
        <div className="text-[11px] text-white/45 bg-white/5 rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex gap-1.5"><Shield className="w-3.5 h-3.5 text-momentum shrink-0 mt-px" /> <span><b className="text-white/70">Accept:</b> best {battle.proposedMetric.toLowerCase()} over the next runs wins the whole territory. Winner +100 pts & a 72h shield.</span></div>
          <div className="flex gap-1.5"><Scissors className="w-3.5 h-3.5 text-ignite shrink-0 mt-px" /> <span><b className="text-white/70">Refuse:</b> if their run beat your claim, they carve off the strip they ran (value −30%, you lose 75 pts). If it didn&apos;t, you keep everything and they take nothing.</span></div>
        </div>

        {error && <p className="text-sm text-ignite mb-3">{error}</p>}

        <div className="space-y-2.5">
          <button
            onClick={() => respond({ action: "ACCEPT_ASYNC" })}
            disabled={submitting}
            className="w-full flex flex-col items-center gap-1 bg-momentum text-midnight font-semibold py-3 rounded-none border-2 border-border-ichor disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4" /> Accept — open challenge (72h)
            </span>
            <MetricPill metric={battle.proposedMetric} />
          </button>

          <button
            onClick={() => setDuelOpen((v) => !v)}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold py-3 rounded-none border-2 border-border-ichor disabled:opacity-50"
          >
            <Swords className="w-4 h-4" /> Accept — schedule a 1v1 duel
          </button>

          {duelOpen && (
            <div className="border-2 border-border-ichor rounded-none p-3 space-y-3">
              <div>
                <label className="text-xs text-white/50 block mb-1.5">Compete on</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["PACE", "DISTANCE"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDuelMetric(m)}
                      className={`text-xs font-semibold py-2 rounded-none border-2 ${
                        duelMetric === m ? "border-momentum bg-momentum/15 text-momentum" : "border-border-ichor text-white/60"
                      }`}
                    >
                      {m === "PACE" ? "Pace (≥3km)" : "Distance (≥8km)"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  Window opens <span className="text-white/30">· times in {shortTz || "your local time"}</span>
                </label>
                <input
                  type="datetime-local"
                  value={windowStart}
                  min={minStart}
                  max={maxStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="w-full bg-midnight border border-border-ichor rounded-none px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Window closes (1–24h later)</label>
                <input
                  type="datetime-local"
                  value={windowEnd}
                  min={windowStart || minStart}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="w-full bg-midnight border border-border-ichor rounded-none px-3 py-2 text-sm"
                />
              </div>
              {windowHours != null && !windowValid && (
                <p className="text-[11px] text-ignite">
                  {windowHours <= 0 ? "The window must close after it opens." : `That window is ${windowHours.toFixed(1)}h long — it must be between 1 and 24 hours.`}
                </p>
              )}
              {windowValid && (
                <p className="text-[11px] text-momentum">Window is {windowHours!.toFixed(1)}h long. Both of you run in the territory during it.</p>
              )}
              <p className="text-[11px] text-white/40">
                Starts at least {DUEL_MIN_NOTICE_HOURS}h out so it&apos;s fair notice. A no-show hands the land to whoever ran.
              </p>
              <button
                onClick={() =>
                  respond({
                    action: "ACCEPT_DUEL",
                    metric: duelMetric,
                    windowStart: windowStart ? new Date(windowStart).toISOString() : "",
                    windowEnd: windowEnd ? new Date(windowEnd).toISOString() : "",
                  })
                }
                disabled={submitting || !windowStart || !windowEnd || !windowValid}
                className="w-full inline-flex items-center justify-center gap-2 bg-ignite text-midnight font-semibold py-2.5 rounded-none disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Lock in the duel
              </button>
            </div>
          )}

          <button
            onClick={() => respond({ action: "REFUSE" })}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 text-ignite font-semibold py-3 rounded-none border-2 border-ignite/40 disabled:opacity-50"
          >
            <Scissors className="w-4 h-4" /> Refuse — divide the land
          </button>
          <p className="text-[11px] text-white/40 text-center">
            Refuse and it&apos;s decided by whose run was stronger: beat you and they carve off what they ran; fall short
            and you keep it all.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The fog-of-war payoff: both runs side by side once a battle resolves. */
export function BattleRevealCard({
  battle,
  currentUserId,
  onClose,
}: {
  battle: BattleListItem;
  currentUserId: string;
  onClose: () => void;
}) {
  const iWon = battle.winnerId === currentUserId;
  const mySide = battle.role;
  const stats = battle.revealedStats;
  const delta = battle.myPointsDelta;

  // Fire exactly once, as a mount side effect — not in the render body, where it re-fired on
  // every re-render and double-fired under React strict/concurrent mode.
  const firedRef = useRef(false);
  useEffect(() => {
    if (iWon && !firedRef.current) {
      firedRef.current = true;
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ["#D4AF37", "#AE93F4", "#ffffff"], disableForReducedMotion: true, zIndex: 2100 });
    }
  }, [iWon]);

  const headline =
    battle.resolution === "SPLIT"
      ? "The land was divided"
      : battle.resolution === "DOUBLE_FORFEIT"
        ? "Nobody showed — both paid"
        : iWon
          ? "Victory"
          : "Defeat";

  function SideStats({ side, label }: { side: "attacker" | "defender"; label: string }) {
    const s = stats?.[side];
    const isMe = side === mySide;
    return (
      <div className={`flex-1 rounded-none border-2 p-3 ${isMe ? "border-momentum bg-momentum/10" : "border-border-ichor bg-white/5"}`}>
        <div className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">{label}{isMe ? " (you)" : ""}</div>
        {s && (s.distanceKm != null || s.avgPaceMinPerKm != null) ? (
          <div className="space-y-1 text-sm font-semibold">
            <div>{s.distanceKm != null ? `${Number(s.distanceKm).toFixed(2)} km` : "—"}</div>
            <div>{formatPace(s.avgPaceMinPerKm)}</div>
            {s.durationSeconds != null && <div className="text-white/50 text-xs">{formatDuration(s.durationSeconds)}</div>}
          </div>
        ) : (
          <div className="text-sm text-white/40">No run</div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className={`font-display italic font-bold text-2xl ${iWon ? "text-lime" : battle.resolution === "SPLIT" ? "text-momentum" : "text-white"}`}>
            {headline}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>
        <p className="text-sm text-white/50 mb-4">
          {battle.territory?.name} · vs {battle.opponent?.name} · {timeAgo(battle.createdAt)}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-momentum mb-3">
          <EyeOff className="w-3.5 h-3.5" /> Fog of war lifted — the runs behind this battle:
        </div>

        <div className="flex gap-2 mb-4">
          <SideStats side="attacker" label="Attacker" />
          <SideStats side="defender" label="Defender" />
        </div>

        {battle.revealGeometry && (
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">
              Where it happened — <span className="text-ignite">attack corridor</span> over{" "}
              <span style={{ color: battle.territory?.color ?? "#AE93F4" }}>the territory</span>
            </div>
            <CorridorMiniMap
              territory={battle.revealGeometry.territory}
              corridor={battle.revealGeometry.corridor}
              color={battle.territory?.color ?? "#AE93F4"}
            />
          </div>
        )}

        {delta != null && delta !== 0 && (
          <div className={`flex items-center justify-between text-sm font-semibold rounded-xl px-3 py-2 mb-3 ${delta > 0 ? "bg-lime/10 text-lime" : "bg-ignite/10 text-ignite"}`}>
            <span className="text-white/60 font-normal text-xs">Your points this battle</span>
            <span>{delta > 0 ? `+${delta}` : delta}</span>
          </div>
        )}

        {battle.resolution === "SPLIT" && (
          <p className="text-xs text-white/50 bg-white/5 rounded-xl p-3">
            The attacker&apos;s run was the stronger one, so they carved off the strip they ran. The territory&apos;s
            value decayed 30%.
          </p>
        )}
        {battle.resolution === "DEFENDER_WIN" && battle.mode === "REFUSED" && (
          <p className="text-xs text-white/50 bg-white/5 rounded-xl p-3">
            The attacker&apos;s run wasn&apos;t stronger than the claim, so the land was repelled intact — and any
            ground that same run had claimed elsewhere went to the defender.
          </p>
        )}
        {(battle.resolution === "ATTACKER_WIN" || (battle.resolution === "DEFENDER_WIN" && battle.mode !== "REFUSED")) && (
          <p className="text-xs text-white/50 bg-white/5 rounded-xl p-3 inline-flex items-center gap-2 w-full">
            <Trophy className="w-4 h-4 text-[#D4AF37] shrink-0" />
            {iWon ? "The territory is yours, with a 72h shield." : "The territory went to the winner. Cooldown before you can attack it again."}
          </p>
        )}
      </div>
    </div>
  );
}
