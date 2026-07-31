"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Check, Crown, MapPin, Share2, X } from "lucide-react";
import { TerritoryMiniMap, type Bbox, type PolygonGeometry } from "./TerritoryMiniMap";

/**
 * The claim moment.
 *
 * Taking new ground is the single best thing that happens in this app, and until now it
 * resolved into a push notification — delivered somewhere else, to someone who had already
 * moved on. A reward the user never actually sees isn't a reward. This is the reveal: the
 * silhouette they just drew, what it's worth, and something they can send to someone.
 *
 * Shown on the manual post path the instant a run claims land (see PostComposer), and from
 * the feed when a Strava-synced run claimed ground while the user was away.
 */

export type ClaimReveal = {
  territoryId: string;
  name: string;
  areaSqM: number;
  valuePoints: number;
  color: string;
  district?: string | null;
  geometry: PolygonGeometry;
  bbox: Bbox;
};

function formatArea(areaSqM: number): string {
  if (areaSqM >= 1_000_000) return `${(areaSqM / 1_000_000).toFixed(2)} km²`;
  return `${Math.round(areaSqM / 1000)}k m²`;
}

export function ClaimRevealSheet({ claim, onClose }: { claim: ClaimReveal; onClose: () => void }) {
  const [shared, setShared] = useState(false);

  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 100,
      origin: { y: 0.45 },
      colors: [claim.color, "#D7F24C", "#ffffff"],
      disableForReducedMotion: true,
      zIndex: 9999,
    });
  }, [claim.color]);

  const summary = `I claimed ${claim.name}${claim.district ? ` in ${claim.district}` : ""} on ICHOR — ${formatArea(
    claim.areaSqM,
  )} of new ground, worth ${claim.valuePoints} points.`;

  async function share() {
    // Web Share where it exists (mobile, where this mostly happens), clipboard everywhere else.
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "I took new ground", text: summary });
        return;
      }
      await navigator.clipboard.writeText(summary);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // User dismissed the share sheet, or the clipboard is blocked — nothing to recover from.
    }
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-sm bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[8px_8px_0_var(--ichor-border)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-lime">
            <Crown className="w-4 h-4" /> Land claimed
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-white/40 hover:text-white/70" />
          </button>
        </div>

        <h2 className="font-display italic font-bold text-3xl leading-tight mb-1">{claim.name}</h2>
        {claim.district && (
          <p className="inline-flex items-center gap-1.5 text-xs text-white/45 mb-4">
            <MapPin className="w-3.5 h-3.5" /> {claim.district}
          </p>
        )}

        <div className="my-4 flex justify-center rounded-none border-2 border-border-ichor bg-midnight py-3">
          <TerritoryMiniMap
            geometry={claim.geometry}
            bbox={claim.bbox}
            color={claim.color}
            width={240}
            height={160}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="border-2 border-border-ichor p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/40 mb-0.5">Ground taken</div>
            <div className="text-lg font-bold">{formatArea(claim.areaSqM)}</div>
          </div>
          <div className="border-2 border-border-ichor p-3">
            <div className="text-[10px] uppercase tracking-wide text-white/40 mb-0.5">Worth</div>
            <div className="text-lg font-bold text-lime">{claim.valuePoints} pts</div>
          </div>
        </div>

        <p className="text-xs text-white/45 mb-5 leading-relaxed">
          It&apos;s yours as long as it keeps getting run. Every kilometre through it — anyone&apos;s — pays you and
          makes it more famous. Leave it untouched too long and it fades back to open ground.
        </p>

        <div className="flex gap-2">
          <button
            onClick={share}
            className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-border-ichor py-3 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            {shared ? <Check className="w-4 h-4 text-lime" /> : <Share2 className="w-4 h-4" />}
            {shared ? "Copied" : "Share"}
          </button>
          <Link
            href="/map"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-momentum text-midnight border-2 border-border-ichor py-3 text-sm font-bold"
          >
            See the map
          </Link>
        </div>
      </div>
    </div>
  );
}
