"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function FollowButton({
  userId,
  initialFollowing,
  size = "md",
  onChange,
}: {
  userId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
  onChange?: (following: boolean) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowing(prev);
        return;
      }
      const data = await res.json();
      setFollowing(data.following);
      onChange?.(data.following);
    } catch {
      setFollowing(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "shrink-0 font-semibold rounded-full transition-colors disabled:opacity-50",
        size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2",
        following
          ? "bg-white/10 text-white/70 hover:bg-white/15 hover:text-ignite"
          : "bg-momentum text-midnight hover:bg-momentum/90",
      )}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
