import { Swords, Shield, Flame, Crown, Sparkles } from "lucide-react";
import type { LevelTier, BadgeIcon } from "@/lib/leveling";

const ICONS: Record<BadgeIcon, typeof Swords> = {
  swords: Swords,
  shield: Shield,
  flame: Flame,
  crown: Crown,
  burst: Sparkles,
};

/**
 * Original ICHOR "leveling up" badge for territories/clans — a dark ringed disc, sized and
 * colored by tier, with a numeral chip. Not any Clash-of-Clans-style artwork: original SVG
 * glyphs (lucide-react) on flat ICHOR brand colors, no borrowed base-building iconography.
 */
export function LevelBadge({
  tier,
  name,
  isOwnedByUser = false,
  isOwnedByClan = false,
  clanColor,
  size,
}: {
  tier: LevelTier;
  /** Territory or clan name, shown in the hover tooltip. */
  name?: string;
  /** Your own territory always rings lavender, regardless of level. */
  isOwnedByUser?: boolean;
  /** A clan-owned territory rings the clan's color instead of the tier color. */
  isOwnedByClan?: boolean;
  clanColor?: string;
  /** Override the tier's own size (e.g. for a compact list row). */
  size?: number;
}) {
  const Icon = ICONS[tier.icon];
  const px = size ?? tier.size;
  const ringColor = isOwnedByUser ? "#AE93F4" : isOwnedByClan && clanColor ? clanColor : tier.ringColor;
  const chip = Math.max(Math.round(px * 0.42), 13);
  const title = name ? `${name} · ${tier.name} · Level ${tier.level}` : `${tier.name} · Level ${tier.level}`;

  return (
    <div
      className={`relative flex items-center justify-center rounded-full shrink-0 ${tier.pulse ? "ichor-badge-pulse" : ""}`}
      style={{
        width: px,
        height: px,
        backgroundColor: "#1A1A1A",
        border: `${tier.ringWidth}px solid ${ringColor}`,
        boxShadow: tier.glow ? `0 0 ${tier.glowPx}px ${ringColor}` : undefined,
      }}
      title={title}
    >
      <Icon width={px * 0.48} height={px * 0.48} color="#FFFFFF" strokeWidth={2.5} />
      <span
        className="absolute flex items-center justify-center rounded-full font-bold leading-none"
        style={{
          width: chip,
          height: chip,
          bottom: -chip * 0.22,
          right: -chip * 0.22,
          backgroundColor: ringColor,
          color: "#0a0a0a",
          fontSize: chip * 0.6,
          border: "1.5px solid #0a0a0a",
        }}
      >
        {tier.level}
      </span>
    </div>
  );
}
