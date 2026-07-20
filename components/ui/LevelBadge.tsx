import { Flame, Shield } from "lucide-react";
import type { LevelTier } from "@/lib/leveling";

/**
 * Original ICHOR "leveling up" badge for territories/clans on the map and in lists — a dark
 * ringed disc colored by tier with a numeral chip, not any Clash-of-Clans-style artwork.
 */
export function LevelBadge({
  tier,
  kind = "territory",
  size = 28,
}: {
  tier: LevelTier;
  kind?: "territory" | "clan";
  size?: number;
}) {
  const Icon = kind === "clan" ? Shield : Flame;
  const chip = Math.max(Math.round(size * 0.48), 13);

  return (
    <div
      className="relative flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: "#0a0a0a",
        border: `2px solid ${tier.color}`,
        boxShadow: `0 0 8px ${tier.color}55`,
      }}
      title={`${tier.label} · Level ${tier.level}`}
    >
      <Icon width={size * 0.5} height={size * 0.5} color={tier.color} strokeWidth={2.5} />
      <span
        className="absolute flex items-center justify-center rounded-full font-bold leading-none"
        style={{
          width: chip,
          height: chip,
          bottom: -chip * 0.25,
          right: -chip * 0.25,
          backgroundColor: tier.color,
          color: "#0a0a0a",
          fontSize: chip * 0.62,
          border: "1.5px solid #0a0a0a",
        }}
      >
        {tier.level}
      </span>
    </div>
  );
}
