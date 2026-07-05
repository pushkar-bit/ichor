"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

export function EditProfileModal({ initialName, initialBio }: { initialName: string; initialBio: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm font-semibold bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full">
        Edit Profile
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-midnight-raised border border-border-ichor rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Edit Profile</h2>
              <button onClick={() => setOpen(false)}>
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-momentum/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-momentum/50 resize-none"
                />
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-momentum text-midnight font-semibold py-2.5 rounded-full disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
