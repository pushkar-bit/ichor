"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldAlert, Flag, Check, Trash2, MapPin, Loader2 } from "lucide-react";

type Stats = { totalUsers: number; postsToday: number; workoutsThisWeek: number; activeClanCount: number };
type FlaggedPost = {
  id: string;
  authorName: string;
  caption: string;
  photoUrl: string | null;
  flagCount: number;
  isHidden: boolean;
};
type ZoneRow = { id: string; name: string; ownerName: string | null; weeklyCalorieScore: number };

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [flagged, setFlagged] = useState<FlaggedPost[]>([]);
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [statsRes, flaggedRes, zonesRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/flagged-posts"),
      fetch("/api/admin/zones"),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (flaggedRes.ok) setFlagged((await flaggedRes.json()).posts);
    if (zonesRes.ok) setZones((await zonesRes.json()).zones);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function restore(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/posts/${id}/restore`, { method: "POST" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }
  async function remove(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/posts/${id}/remove`, { method: "POST" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-ignite" />
        <h1 className="font-display italic font-bold text-3xl">Admin</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total Users" value={stats?.totalUsers} />
        <StatBox label="Posts Today" value={stats?.postsToday} />
        <StatBox label="Workouts (7d)" value={stats?.workoutsThisWeek} />
        <StatBox label="Active Clans" value={stats?.activeClanCount} />
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      )}

      {!loading && (
      <>
      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-3 flex items-center gap-1.5">
          <Flag className="w-4 h-4" /> Flagged Posts ({flagged.length})
        </h2>
        {flagged.length === 0 ? (
          <p className="text-sm text-white/30 py-6 text-center bg-midnight-raised border border-border-ichor rounded-xl">
            No posts currently flagged for review.
          </p>
        ) : (
          <div className="space-y-2">
            {flagged.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl p-3">
                {p.photoUrl && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <Image src={p.photoUrl} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.authorName}</div>
                  <div className="text-xs text-white/40 truncate">{p.caption}</div>
                  <div className="text-xs text-ignite">{p.flagCount} flags</div>
                </div>
                <button
                  onClick={() => restore(p.id)}
                  disabled={busyId === p.id}
                  className="p-2 rounded-full bg-lime/15 text-lime disabled:opacity-50"
                >
                  {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => remove(p.id)}
                  disabled={busyId === p.id}
                  className="p-2 rounded-full bg-ignite/15 text-ignite disabled:opacity-50"
                >
                  {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-sm text-white/60 mb-3 flex items-center gap-1.5">
          <MapPin className="w-4 h-4" /> Campus Zones ({zones.length})
        </h2>
        <div className="space-y-1.5">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between bg-midnight-raised border border-border-ichor rounded-lg px-3.5 py-2.5">
              <span className="text-sm font-medium">{z.name}</span>
              <span className="text-xs text-white/40">
                {z.ownerName ? `${z.ownerName} · ${z.weeklyCalorieScore} pts` : "Unclaimed"}
              </span>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value?: number }) {
  return (
    <div className="bg-midnight-raised border border-border-ichor rounded-xl p-3.5 text-center">
      <div className="text-xl font-bold">{value ?? "—"}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wide">{label}</div>
    </div>
  );
}
