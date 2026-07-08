"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/feed");
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">Delete this post?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 inline-flex items-center gap-1"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Yes, delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-white/40 hover:text-white"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
      Delete post
    </button>
  );
}
