"use client";

import { useEffect, useState } from "react";
import { Map as MapIcon, Swords, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Countdown } from "./Countdown";
import type { DistrictStanding } from "@/lib/districts";
import type { LandWarStanding } from "@/lib/landWar";

/**
 * Local standings — the scope an ordinary runner can actually win.
 *
 * The global fame board is permanently owned by whoever runs the most kilometres, which
 * leaves everyone else spectating. A district is a few streets: leading one is a real,
 * reachable goal, and losing one to a neighbour is a real, specific loss.
 *
 * Shares are of *claimed* ground within the district, not of its real-world area — nobody
 * will ever run 100% of a suburb, and a number that caps out at 2% motivates no one.
 */

type DistrictResponse = {
  districts: DistrictStanding[];
  landWar: {
    isOpen: boolean;
    start: string;
    end: string;
    nextStart: string | null;
    standings: LandWarStanding[];
  };
};

export function DistrictPanel({ currentUserId }: { currentUserId: string }) {
  const [data, setData] = useState<DistrictResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/territories/districts")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mt-8 h-32 skeleton rounded-xl" />;
  if (!data || (data.districts.length === 0 && !data.landWar.isOpen)) return null;

  const war = data.landWar;

  return (
    <div className="mt-8 space-y-6">
      {/* Land War: only worth screen space while it's live or imminent. */}
      {(war.isOpen || war.standings.length > 0) && (
        <div className="border-2 border-border-ichor bg-midnight-raised">
          <div className="flex items-center justify-between gap-2 border-b-2 border-border-ichor px-4 py-3">
            <span className="inline-flex items-center gap-2 font-bold text-sm">
              <Swords className={`w-4 h-4 ${war.isOpen ? "text-lime" : "text-white/40"}`} />
              Land War
            </span>
            <span className="text-xs text-white/50">
              {war.isOpen ? (
                <>
                  live · <Countdown to={war.end} suffix=" left" expiredText="closing" />
                </>
              ) : war.nextStart ? (
                <>
                  opens in <Countdown to={war.nextStart} prefix="" suffix="" expiredText="now" />
                </>
              ) : (
                "closed"
              )}
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-white/45 mb-3">
              Every weekend, kilometres you run through a <span className="text-white/70">rival clan&apos;s</span> ground
              pay your own empire on top of the usual rewards.
            </p>
            {war.standings.length === 0 ? (
              <p className="text-xs text-white/30">No clan has scored yet this window.</p>
            ) : (
              <div className="space-y-1.5">
                {war.standings.slice(0, 5).map((s, i) => (
                  <div key={s.clanId} className="flex items-center gap-2.5 text-sm">
                    <span className="w-4 text-xs font-bold text-white/35 shrink-0">{i + 1}</span>
                    <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 min-w-0 truncate">{s.name}</span>
                    <span className="text-xs text-white/35 shrink-0">
                      {s.contributors} runner{s.contributors === 1 ? "" : "s"}
                    </span>
                    <span className="font-bold text-sm text-lime shrink-0">{s.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {data.districts.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <MapIcon className="w-4 h-4 text-momentum" />
            <h2 className="font-semibold text-sm text-white/60">Districts</h2>
          </div>
          <div className="space-y-2">
            {data.districts.map((d) => {
              const isOpen = expanded === d.district;
              return (
                <div key={d.district} className="border-2 border-border-ichor bg-midnight-raised">
                  <button
                    onClick={() => setExpanded(isOpen ? null : d.district)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{d.district}</div>
                      <div className="text-xs text-white/40">
                        {d.totalTerritories} territor{d.totalTerritories === 1 ? "y" : "ies"} claimed
                      </div>
                    </div>
                    {d.me ? (
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-momentum">{d.me.sharePct}%</span>
                        <span className="block text-[10px] uppercase tracking-wide text-white/35">
                          yours · #{d.me.rank}
                        </span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-white/30">not yours yet</span>
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-border-ichor px-4 py-3 space-y-2">
                      {d.holders.map((h, i) => (
                        <div key={h.userId} className="flex items-center gap-2.5">
                          <span className="w-4 text-xs font-bold text-white/35 shrink-0">{i + 1}</span>
                          <Avatar src={h.avatarUrl} name={h.name} size={24} />
                          <span className="flex-1 min-w-0 truncate text-sm">
                            {h.userId === currentUserId ? "You" : h.name}
                          </span>
                          {i === 0 && <Trophy className="w-3.5 h-3.5 text-lime shrink-0" />}
                          <span className="text-sm font-semibold shrink-0">{h.sharePct}%</span>
                        </div>
                      ))}
                      {/* Share bar: the district's claimed ground, split by holder. */}
                      <div className="flex h-1.5 overflow-hidden mt-2">
                        {d.holders.map((h) => (
                          <div
                            key={h.userId}
                            style={{ width: `${h.sharePct}%`, backgroundColor: h.userId === currentUserId ? "#D7F24C" : "#AE93F4" }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
