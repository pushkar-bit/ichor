"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SkeletonCard } from "@/components/ui/StatChip";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "calories", label: "Calorie King", scope: "week" as const },
  { key: "streak", label: "Grind Streak", scope: "all-time" as const },
  { key: "pace", label: "Pace God", scope: "all-time" as const },
  { key: "distance", label: "Distance Destroyer", scope: "week" as const },
  { key: "integrity", label: "Integrity Champion", scope: "all-time" as const },
  { key: "clans", label: "Clan Wars", scope: "week" as const },
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

export function LeaderboardClient() {
  const [category, setCategory] = useState("calories");
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboards/${category}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setMeId(data.me ?? null);
      })
      .finally(() => setLoading(false));
  }, [category]);

  const isClan = category === "clans";
  const activeCategory = CATEGORIES.find((c) => c.key === category)!;

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
              <div>{c.label}</div>
              <div className={cn("text-[10px] uppercase tracking-wide", category === c.key ? "text-midnight/60" : "text-white/30")}>
                {c.scope === "week" ? "This week" : "All-time"}
              </div>
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0">
          {/* Mobile pill-bar fallback */}
          <div className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar md:hidden">
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
                  {activeCategory.scope === "week" ? "No data yet this week." : "No rankings yet."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
