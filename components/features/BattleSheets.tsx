"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { X, Swords, Shield, Scissors, Timer, Footprints, EyeOff, Trophy, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatPace, formatDuration, timeAgo } from "@/lib/utils";

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
  createdAt: string;
};

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
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

        <div className="flex items-start gap-2 text-xs text-white/50 bg-white/5 rounded-xl p-3 mb-4">
          <EyeOff className="w-4 h-4 shrink-0 mt-0.5" />
          Fog of war: you can&apos;t see their run, they can&apos;t see yours. They proposed a{" "}
          {battle.proposedMetric.toLowerCase()} battle.
          {battle.respondBy && <> Respond by {new Date(battle.respondBy).toLocaleString()} — silence counts as refusing.</>}
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
                <label className="text-xs text-white/50 block mb-1">Window opens</label>
                <input
                  type="datetime-local"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="w-full bg-midnight border border-border-ichor rounded-none px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Window closes (1–24h later)</label>
                <input
                  type="datetime-local"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="w-full bg-midnight border border-border-ichor rounded-none px-3 py-2 text-sm"
                />
              </div>
              <p className="text-[11px] text-white/40">
                Both of you must run in the territory during this window. A no-show hands the land to whoever ran.
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
                disabled={submitting || !windowStart || !windowEnd}
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
            Refusing splits the territory along their run, burns 30% of its value, and costs you both points — the
            weaker run pays more.
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

  if (iWon && typeof window !== "undefined") {
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ["#D4AF37", "#AE93F4", "#ffffff"], disableForReducedMotion: true, zIndex: 100 });
  }

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
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

        {battle.resolution === "SPLIT" && (
          <p className="text-xs text-white/50 bg-white/5 rounded-xl p-3">
            The attacker took the ground they ran; the territory&apos;s value decayed 30%. The weaker run lost 75
            points, the stronger 25.
          </p>
        )}
        {(battle.resolution === "ATTACKER_WIN" || battle.resolution === "DEFENDER_WIN") && (
          <p className="text-xs text-white/50 bg-white/5 rounded-xl p-3 inline-flex items-center gap-2 w-full">
            <Trophy className="w-4 h-4 text-[#D4AF37] shrink-0" />
            {iWon ? "+100 points, and the territory is yours (72h shield)." : "The territory went to the winner. Cooldown before you can attack it again."}
          </p>
        )}
      </div>
    </div>
  );
}
