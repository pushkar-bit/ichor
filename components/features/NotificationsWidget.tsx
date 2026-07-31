"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/utils";
import { NotificationBell, iconFor, NOTIFICATIONS_POLL_MS, type InboxNotification } from "./NotificationBell";

const PREVIEW_COUNT = 3;
const DISMISS_KEY = "ichor.notifDismissed";

/**
 * The feed's right-rail notifications card: the last 3 notifications, always visible, no
 * click required — unlike NotificationBell's dropdown, which only shows anything once you
 * open it. NotificationBell itself is reused here as the card's top-right control (its badge
 * + full history dropdown), so "see everything" and "see what just happened" are two
 * different affordances instead of one dropdown trying to be both.
 *
 * Dismissing a card is local-only (sessionStorage, same pattern as ForYouRail's per-session
 * dismissal) — it also marks the notification read server-side, but staying hidden here for
 * the rest of the session doesn't depend on the read flag, so it can't un-dismiss itself
 * because a *newer* notification arrived and read state got recomputed.
 */
export function NotificationsWidget() {
  const router = useRouter();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications);
    } catch {
      // polling failure is fine — next tick retries
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const interval = setInterval(refresh, NOTIFICATIONS_POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  function markRead(ids: string[]) {
    fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {
      /* best-effort — a missed read receipt just means the badge stays a little stale */
    });
  }

  function dismiss(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      try {
        sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
      } catch {
        /* private mode — dismissal just won't survive a reload, which is fine */
      }
      return next;
    });
    markRead([id]);
  }

  function open(n: InboxNotification) {
    if (!n.readAt) markRead([n.id]);
    router.push(n.href);
  }

  const visible = items.filter((n) => !dismissed.has(n.id)).slice(0, PREVIEW_COUNT);

  return (
    <div className="bg-midnight-raised border-2 border-border-ichor rounded-none p-4 shadow-[6px_6px_0_var(--ichor-border)] mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">Notifications</h2>
        <NotificationBell />
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-white/30" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-xs text-white/40 text-center py-4">Nothing yet. Go claim some ground.</p>
      ) : (
        <div className="space-y-1">
          {visible.map((n) => (
            <div key={n.id} className="relative">
              <button
                onClick={() => open(n)}
                className={`w-full text-left flex items-start gap-2.5 rounded-lg py-2 pl-1 pr-7 hover:bg-white/5 transition-colors ${
                  n.readAt ? "opacity-60" : ""
                }`}
              >
                {n.actor ? (
                  <span className="relative shrink-0">
                    <Avatar src={n.actor.avatarUrl} name={n.actor.name} size={26} />
                    <span className="absolute -bottom-1 -right-1 bg-midnight-raised rounded-full p-[3px]">
                      {iconFor(n.type)}
                    </span>
                  </span>
                ) : (
                  <span className="shrink-0 mt-0.5">{iconFor(n.type)}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium leading-snug line-clamp-2">{n.title}</div>
                  <div className="text-[10px] text-white/30 mt-0.5">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-momentum shrink-0 mt-1.5" />}
              </button>
              <button
                onClick={(e) => dismiss(n.id, e)}
                aria-label="Dismiss notification"
                className="absolute top-1 right-1 text-white/25 hover:text-white/70 p-1 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
