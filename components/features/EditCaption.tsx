"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, X, Check } from "lucide-react";

export function EditCaption({ postId, initialCaption, isOwner }: { postId: string; initialCaption: string; isOwner: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) {
    return initialCaption ? <p className="text-sm text-white/80 leading-relaxed">{initialCaption}</p> : null;
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        {initialCaption ? (
          <p className="text-sm text-white/80 leading-relaxed flex-1">{initialCaption}</p>
        ) : (
          <p className="text-sm text-white/30 italic flex-1">No caption yet.</p>
        )}
        <button onClick={() => setEditing(true)} className="text-white/40 hover:text-white shrink-0" aria-label="Edit caption">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError("Failed to save. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 300))}
        rows={3}
        autoFocus
        className="w-full bg-midnight border border-border-ichor rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-momentum/50 resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/30">{caption.length}/300</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCaption(initialCaption);
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs font-medium text-white/50 hover:text-white px-2.5 py-1.5 rounded-full disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs font-semibold bg-momentum text-midnight px-2.5 py-1.5 rounded-full disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-ignite">{error}</p>}
    </div>
  );
}
