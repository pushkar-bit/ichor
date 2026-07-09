"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonCard } from "@/components/ui/StatChip";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "calories", label: "Calorie King" },
  { key: "streak", label: "Grind Streak" },
  { key: "pace", label: "Pace God" },
  { key: "distance", label: "Distance Destroyer" },
  { key: "integrity", label: "Integrity Champion" },
  { key: "clans", label: "Clan Wars" },
];

const RANGES = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

const RANK_COLORS = ["#D4AF37", "#C0C0C0", "#CD7F32"];

type Row = {
  userId?: string;
  username?: string | null;
  clanId?: string;
  name: string;
  tag?: string;
  color?: string;
  avatarUrl?: string;
  value: number;
  unit: string;
  memberCount?: number;
  zonesHeld?: number;
};

type LeaderboardInitialData = { rows: Row[]; me: string | null };

export function LeaderboardClient({ initialData }: { initialData?: LeaderboardInitialData }) {
  const [category, setCategory] = useState("calories");
  const [range, setRange] = useState("week");
  const [rows, setRows] = useState<Row[]>(initialData?.rows ?? []);
  const [meId, setMeId] = useState<string | null>(initialData?.me ?? null);
  const [loading, setLoading] = useState(!initialData);
  // The page already server-fetched calories/week — skip the redundant client refetch on mount.
  const skipNextLoad = useRef(Boolean(initialData));

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    setLoading(true);
    fetch(`/api/leaderboards/${category}?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setMeId(data.me ?? null);
      })
      .finally(() => setLoading(false));
  }, [category, range]);

  const isClan = category === "clans";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-display italic font-bold text-3xl mb-6">Leaderboards</h1>

      <div className="md:flex md:gap-6">
        {/* Desktop sidebar category switcher */}
        <aside className="hidden md:flex md:flex-col md:w-48 shrink-0 gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                category === c.key ? "bg-momentum text-midnight" : "text-white/60 hover:text-white hover:bg-midnight-raised",
              )}
            >
              {c.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          {/* Mobile pill-bar fallback */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar md:hidden">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={cn(
                  "shrink-0 text-sm font-medium px-3.5 py-1.5 rounded-full transition-colors",
                  category === c.key ? "bg-momentum text-midnight" : "bg-midnight-raised text-white/50 hover:text-white",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Range switcher — applies to whichever category is active */}
          <div className="flex items-center gap-1.5 mb-6">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                  range === r.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              <SkeletonCard />
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row, i) => {
                const rank = i + 1;
                const isMe = isClan ? row.clanId === meId : row.userId === meId;
                const content = (
                  <>
                    <span
                      className="w-6 text-center font-bold text-sm shrink-0"
                      style={{ color: rank <= 3 ? RANK_COLORS[rank - 1] : "rgba(255,255,255,0.4)" }}
                    >
                      {rank}
                    </span>
                    {isClan ? (
                      <span className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: row.color }} />
                    ) : (
                      <Avatar src={row.avatarUrl} name={row.name} size={32} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{row.name}</span>
                        {row.tag && (
                          <span className="text-[10px] font-bold text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                            {row.tag}
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[10px] font-bold text-momentum bg-momentum/15 px-1.5 py-0.5 rounded">YOU</span>
                        )}
                      </div>
                      {isClan && (
                        <span className="text-[11px] text-white/40">
                          {row.memberCount} members · {row.zonesHeld} zones
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {typeof row.value === "number" ? (Number.isInteger(row.value) ? row.value : row.value.toFixed(2)) : row.value}{" "}
                      <span className="text-white/40 text-xs">{row.unit}</span>
                    </span>
                  </>
                );
                const rowClassName = cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl",
                  isMe ? "bg-momentum/10 border border-momentum/30" : "bg-midnight-raised border border-transparent",
                );
                return !isClan && row.username ? (
                  <Link key={row.userId} href={`/profile/${row.username}`} className={cn(rowClassName, "hover:border-momentum/40")}>
                    {content}
                  </Link>
                ) : (
                  <div key={row.userId ?? row.clanId} className={rowClassName}>
                    {content}
                  </div>
                );
              })}
              {rows.length === 0 && (
                <p className="text-center text-white/30 text-sm py-10">
                  {range === "all" ? "No rankings yet." : `No data yet ${range === "week" ? "this week" : "this month"}.`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
