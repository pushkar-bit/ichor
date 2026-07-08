"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const CATEGORIES = [
  { key: "calories", label: "Calorie King" },
  { key: "streak", label: "Grind Streak" },
  { key: "pace", label: "Pace God" },
  { key: "distance", label: "Distance Destroyer" },
  { key: "integrity", label: "Integrity Champion" },
  { key: "clans", label: "Clan Wars" },
];

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
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
};

const TOP_N = 8;

/** Condensed leaderboard for the feed's right rail — same data as the full /leaderboard page. */
export function LeaderboardWidget() {
  const [category, setCategory] = useState("calories");
  const [range, setRange] = useState("week");
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboards/${category}?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        setRows((data.rows ?? []).slice(0, TOP_N));
        setMeId(data.me ?? null);
      })
      .finally(() => setLoading(false));
  }, [category, range]);

  const isClan = category === "clans";

  return (
    <div className="bg-midnight-raised border-2 border-border-ichor rounded-none p-4 shadow-[6px_6px_0_var(--ichor-border)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display italic font-bold text-lg flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-momentum" /> Leaderboards
        </h2>
        <Link href="/leaderboard" className="text-[11px] font-semibold text-momentum hover:text-afterrun">
          See all
        </Link>
      </div>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full bg-midnight border border-border-ichor rounded-lg px-2.5 py-2 text-xs font-medium mb-2.5 focus:outline-none focus:border-momentum/50"
      >
        {CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 mb-3">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              "flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors",
              range === r.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg skeleton" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-white/30 text-xs py-6">
          {range === "all" ? "No rankings yet." : `No data yet ${range === "week" ? "this week" : "this month"}.`}
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => {
            const rank = i + 1;
            const isMe = isClan ? row.clanId === meId : row.userId === meId;
            const content = (
              <>
                <span
                  className="w-4 text-center font-bold text-[11px] shrink-0"
                  style={{ color: rank <= 3 ? RANK_COLORS[rank - 1] : "rgba(255,255,255,0.35)" }}
                >
                  {rank}
                </span>
                {isClan ? (
                  <span className="w-6 h-6 rounded-md shrink-0" style={{ backgroundColor: row.color }} />
                ) : (
                  <Avatar src={row.avatarUrl} name={row.name} size={24} />
                )}
                <span className="flex-1 min-w-0 text-xs font-medium truncate">{row.name}</span>
                <span className="text-[11px] font-semibold text-white/70 shrink-0">
                  {typeof row.value === "number" ? (Number.isInteger(row.value) ? row.value : row.value.toFixed(1)) : row.value}
                </span>
              </>
            );
            const rowClassName = cn(
              "flex items-center gap-2 px-1.5 py-1.5 rounded-lg",
              isMe && "bg-momentum/10",
            );
            return !isClan && row.username ? (
              <motion.div
                key={row.userId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link href={`/profile/${row.username}`} className={cn(rowClassName, "hover:bg-white/5")}>
                  {content}
                </Link>
              </motion.div>
            ) : (
              <motion.div 
                key={row.clanId || row.userId} 
                className={rowClassName}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                {content}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
