"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

export function FlagButton({ postId }: { postId: string }) {
  const [flagged, setFlagged] = useState(false);
  const [busy, setBusy] = useState(false);

  async function flag() {
    if (busy || flagged) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/flag`, { method: "POST" });
      if (res.ok) setFlagged(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={flag}
      disabled={busy || flagged}
      className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-ignite disabled:text-ignite"
    >
      <Flag className="w-3.5 h-3.5" />
      {flagged ? "Flagged" : "Report"}
    </button>
  );
}
