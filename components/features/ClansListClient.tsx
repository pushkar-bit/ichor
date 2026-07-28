"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/StatChip";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { clanLevel } from "@/lib/leveling";

type ClanRow = {
  id: string;
  name: string;
  tag: string;
  color: string;
  memberCount: number;
  score: number;
  zonesHeld?: number;
  totalKm?: number;
};

export function ClansListClient({ myClanId, initialClans }: { myClanId: string | null; initialClans?: ClanRow[] }) {
  const [clans, setClans] = useState<ClanRow[]>(initialClans ?? []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(!initialClans);
  // The page already server-fetched the unfiltered list — skip the redundant client refetch on mount.
  const skipNextLoad = useRef(Boolean(initialClans));

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const url = query.trim() ? `/api/clans/search?q=${encodeURIComponent(query)}` : "/api/clans";
    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setClans(data.clans ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display italic font-bold text-3xl">Clans</h1>
        {myClanId ? (
          <Link href="/empire" className="text-sm font-semibold bg-white/10 px-3.5 py-2 rounded-full">
            My Clan
          </Link>
        ) : (
          <Link
            href="/clans/create"
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-momentum text-midnight px-3.5 py-2 rounded-full"
          >
            <Plus className="w-4 h-4" /> Create
          </Link>
        )}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or 4-letter tag..."
          className="w-full bg-midnight-raised border border-border-ichor rounded-full pl-10 pr-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-momentum/50"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg shrink-0 skeleton" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 w-32 rounded skeleton" />
                <div className="h-2.5 w-20 rounded skeleton" />
              </div>
              <div className="h-3 w-10 rounded skeleton" />
            </div>
          ))}
        </div>
      ) : clans.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} title="No clans found" description="Start your own and recruit your crew." />
      ) : (
        <div className="space-y-2">
          {clans.map((clan) => (
            <Link
              key={clan.id}
              href={`/clans/${clan.id}`}
              className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 hover:border-momentum/40"
            >
              <span className="w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: clan.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{clan.name}</span>
                  <span className="text-[10px] font-bold text-white/40 bg-white/5 px-1.5 py-0.5 rounded">{clan.tag}</span>
                  {clan.zonesHeld !== undefined && clan.totalKm !== undefined && (
                    <LevelBadge
                      tier={clanLevel({ totalKm: clan.totalKm, territoriesHeld: clan.zonesHeld })}
                      isOwnedByClan
                      clanColor={clan.color}
                      size={20}
                    />
                  )}
                </div>
                <span className="text-xs text-white/40">{clan.memberCount}/10 members</span>
              </div>
              {clan.score !== undefined && <span className="text-sm font-semibold">{clan.score} pts</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
