"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "./FollowButton";
import type { FollowSuggestion } from "@/lib/followSuggestions";

const REASON_LABEL: Record<FollowSuggestion["reason"], string> = {
  clanmate: "In your clan",
  reacted_to_you: "Reacted to your posts",
  you_reacted: "You've reacted to them",
  popular: "Popular on ICHOR",
};

/** Suggested-follows widget for the feed's right rail, below the leaderboard. */
export function FollowWidget({ initialSuggestions }: { initialSuggestions?: FollowSuggestion[] }) {
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>(initialSuggestions ?? []);
  const [loading, setLoading] = useState(!initialSuggestions);
  // The feed page already server-fetched suggestions — skip the redundant client refetch on mount.
  const skipNextLoad = useRef(Boolean(initialSuggestions));

  useEffect(() => {
    if (skipNextLoad.current) {
      skipNextLoad.current = false;
      return;
    }
    fetch("/api/users/suggestions")
      .then((r) => r.json())
      .then((data) => setSuggestions(data.suggestions ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="bg-midnight-raised border-2 border-border-ichor rounded-none p-4 shadow-[6px_6px_0_var(--ichor-border)] mt-6">
      <h2 className="font-display italic font-bold text-lg flex items-center gap-1.5 mb-3">
        <UserPlus className="w-4 h-4 text-momentum" /> Suggested for you
      </h2>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg skeleton" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5">
              {s.username ? (
                <Link href={`/profile/${s.username}`} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80">
                  <Avatar src={s.avatarUrl} name={s.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-white/40 truncate">{REASON_LABEL[s.reason]}</div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Avatar src={s.avatarUrl} name={s.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-white/40 truncate">{REASON_LABEL[s.reason]}</div>
                  </div>
                </div>
              )}
              <FollowButton userId={s.id} initialFollowing={false} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
