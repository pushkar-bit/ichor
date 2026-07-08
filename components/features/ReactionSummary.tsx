"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Flame, Handshake, Swords } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type Summary = { featuredName: string; featuredAvatarUrl: string; totalCount: number };
type Reactor = { id: string; name: string; username: string | null; avatarUrl: string; types: string[] };

const TYPE_ICON: Record<string, { Icon: typeof Flame; className: string }> = {
  HYPE: { Icon: Flame, className: "text-afterrun" },
  RESPECT: { Icon: Handshake, className: "text-lime" },
  CHALLENGE: { Icon: Swords, className: "text-ignite" },
};

export function ReactionSummary({ postId, summary }: { postId: string; summary: Summary }) {
  const [open, setOpen] = useState(false);
  const [reactors, setReactors] = useState<Reactor[] | null>(null);
  const loading = open && reactors === null;

  useEffect(() => {
    if (!open || reactors) return;
    fetch(`/api/posts/${postId}/reactors`)
      .then((r) => r.json())
      .then((data) => setReactors(data.reactors ?? []))
      .catch(() => setReactors([]));
  }, [open, postId, reactors]);

  const othersCount = summary.totalCount - 1;
  const label =
    summary.totalCount <= 1 ? (
      <>Liked by <span className="font-semibold text-white/90">{summary.featuredName}</span></>
    ) : (
      <>
        Liked by <span className="font-semibold text-white/90">{summary.featuredName}</span> and{" "}
        <span className="font-semibold text-white/90">
          {othersCount} {othersCount === 1 ? "other" : "others"}
        </span>
      </>
    );

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-white/60 hover:text-white text-left">
        {label}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
            <div
              className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl bg-midnight-raised border border-border-ichor max-h-[70vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border-ichor shrink-0">
                <h2 className="font-semibold text-sm">Reactions</h2>
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5 text-white/40" />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {loading && <p className="text-center text-sm text-white/30 py-8">Loading...</p>}
                {!loading && reactors?.length === 0 && <p className="text-center text-sm text-white/30 py-8">No reactions yet.</p>}
                {!loading &&
                  reactors?.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-2 py-2.5">
                      <Avatar src={r.avatarUrl} name={r.name} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        {r.username && <div className="text-xs text-white/40 truncate">@{r.username}</div>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {r.types.map((type) => {
                          const conf = TYPE_ICON[type];
                          if (!conf) return null;
                          const { Icon, className } = conf;
                          return <Icon key={type} className={`w-4 h-4 ${className}`} />;
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
