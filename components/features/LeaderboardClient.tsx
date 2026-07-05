"use client";

import { useEffect, useState } from "react";
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

const RANK_COLORS = ["#D4AF37", "#C0C0C0", "#CD7F32"];

type Row = {
  userId?: string;
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

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-display italic font-bold text-3xl mb-5">Leaderboards</h1>

      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto no-scrollbar">
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
            return (
              <div
                key={row.userId ?? row.clanId}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl",
                  isMe ? "bg-momentum/10 border border-momentum/30" : "bg-midnight-raised border border-transparent",
                )}
              >
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
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-center text-white/30 text-sm py-10">No data yet this week.</p>}
        </div>
      )}
    </div>
  );
}
