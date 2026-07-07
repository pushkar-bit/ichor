"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/StatChip";

type UserRow = { id: string; name: string; username: string | null; avatarUrl: string };

export function SearchClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setUsers(data.users ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="font-display italic font-bold text-3xl mb-5">Search</h1>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username..."
          autoFocus
          className="w-full bg-midnight-raised border border-border-ichor rounded-full pl-10 pr-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-momentum/50"
        />
      </div>

      {loading ? (
        <p className="text-sm text-white/30 text-center py-10">Searching...</p>
      ) : !query.trim() ? (
        <EmptyState icon={<UserRound className="w-6 h-6" />} title="Find someone" description="Search by their name or @username." />
      ) : users.length === 0 ? (
        <EmptyState icon={<UserRound className="w-6 h-6" />} title="No one found" description="Try a different name or username." />
      ) : (
        <div className="space-y-2">
          {users.map((u) =>
            u.username ? (
              <Link
                key={u.id}
                href={`/profile/${u.username}`}
                className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 hover:border-momentum/40"
              >
                <Avatar src={u.avatarUrl} name={u.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{u.name}</div>
                  <div className="text-xs text-white/40 truncate">@{u.username}</div>
                </div>
              </Link>
            ) : (
              <div
                key={u.id}
                className="flex items-center gap-3 bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 opacity-60"
              >
                <Avatar src={u.avatarUrl} name={u.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{u.name}</div>
                  <div className="text-xs text-white/40 truncate">No profile yet</div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
