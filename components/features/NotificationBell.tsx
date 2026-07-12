"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Swords, MapPin, Trophy, Loader2 } from "lucide-react";
import { timeAgo } from "@/lib/utils";

type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { battleId: string | null; territoryId: string | null; workoutId: string | null };
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 60_000;

function iconFor(type: string) {
  if (type.startsWith("ATTACK") || type.startsWith("BATTLE") || type.startsWith("DUEL") || type === "OPPONENT_SUBMITTED") {
    return <Swords className="w-4 h-4 text-ignite shrink-0" />;
  }
  if (type.startsWith("TERRITORY")) return <MapPin className="w-4 h-4 text-momentum shrink-0" />;
  return <Trophy className="w-4 h-4 text-lime shrink-0" />;
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount);
      setItems(data.notifications);
    } catch {
      // polling failure is fine — next tick retries
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(interval);
  }, [refreshCount]);

  async function openInbox() {
    setOpen(true);
    setLoading(true);
    await refreshCount();
    setLoading(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  function openItem(n: InboxNotification) {
    if (!n.readAt) {
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setUnreadCount((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    setOpen(false);
    // Everything territory/battle-shaped lives on the map page.
    router.push("/map");
  }

  return (
    <>
      <button
        onClick={openInbox}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-none border-2 border-border-ichor text-white/60 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-ignite text-midnight text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="w-full sm:max-w-sm sm:mt-16 sm:mr-6 bg-midnight-raised border-2 border-border-ichor rounded-t-3xl sm:rounded-none sm:shadow-[6px_6px_0_var(--ichor-border)] max-h-[75vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border-ichor">
              <h2 className="font-semibold">Notifications</h2>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-momentum">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-10">Nothing yet. Go claim some ground.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`w-full text-left flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-white/5 transition-colors ${
                      n.readAt ? "opacity-60" : ""
                    }`}
                  >
                    {iconFor(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium leading-snug">{n.title}</div>
                      {n.body && <div className="text-xs text-white/50 mt-0.5 leading-snug">{n.body}</div>}
                      <div className="text-[11px] text-white/30 mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.readAt && <span className="w-2 h-2 rounded-full bg-momentum shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
