"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/utils";

type CommentData = {
  id: string;
  parentId: string | null;
  text: string;
  createdAt: string;
  author: { name: string; avatarUrl?: string };
};

export function CommentSection({ postId, initialComments }: { postId: string; initialComments: CommentData[] }) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a comment..."
          className="flex-1 bg-midnight border border-border-ichor rounded-full px-4 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-momentum/50"
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="bg-momentum text-midnight text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-40"
        >
          Post
        </button>
      </div>

      {topLevel.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-6">No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-4">
          {topLevel.map((c) => (
            <div key={c.id} className="space-y-3">
              <CommentRow comment={c} />
              {repliesOf(c.id).length > 0 && (
                <div className="pl-9 space-y-3 border-l border-border-ichor ml-4">
                  {repliesOf(c.id).map((r) => (
                    <CommentRow key={r.id} comment={r} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: CommentData }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar src={comment.author.avatarUrl} name={comment.author.name} size={28} />
      <div className="flex-1 min-w-0">
        <div className="bg-midnight-raised rounded-2xl px-3.5 py-2">
          <span className="text-xs font-semibold">{comment.author.name}</span>
          <p className="text-sm text-white/80">{comment.text}</p>
        </div>
        <span className="text-[11px] text-white/30 pl-3.5">{timeAgo(comment.createdAt)}</span>
      </div>
    </div>
  );
}
