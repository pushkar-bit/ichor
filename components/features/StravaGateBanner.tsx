"use client";

import { usePathname } from "next/navigation";
import { Link2, ArrowRight } from "lucide-react";

/**
 * Shown app-wide (see app/(app)/layout.tsx) until an account has Strava connected. Everything
 * below it is dimmed so this is the only thing competing for attention — but deliberately still
 * interactive: screenshot/manual logging is a supported path, and most existing accounts predate
 * this banner, so a hard lock-out would strand them rather than convert them.
 */
export function StravaGateBanner({ beginnerMode = false }: { beginnerMode?: boolean }) {
  const pathname = usePathname();
  // Come back to whatever page they were on, rather than always dumping them on the feed.
  const returnTo = encodeURIComponent(pathname || (beginnerMode ? "/start" : "/feed"));

  return (
    <div className="md:sticky md:top-0 md:z-30 px-4 pt-4 pb-2 bg-midnight">
      <div className="max-w-xl mx-auto bg-midnight-raised border-2 border-[#FC4C02]/50 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FC4C02]/15 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-[#FC4C02]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display italic font-bold text-lg leading-tight mb-1">Connect Strava to continue</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              {beginnerMode
                ? "Your sessions are counted automatically from Strava. Connect once and every walk or run you do gets logged for you — you'll never have to type a workout in by hand."
                : "ICHOR reads your runs straight from Strava. Connect once and every run syncs here automatically — and the ground it covers becomes your territory on the map."}
            </p>
          </div>
        </div>
        <a
          href={`/api/integrations/strava/connect?returnTo=${returnTo}`}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-[#FC4C02] text-white font-bold text-sm py-3 rounded-full"
        >
          <Link2 className="w-4 h-4" /> Connect Strava <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
