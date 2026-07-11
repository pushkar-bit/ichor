"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { resizeToDataUrl } from "@/lib/image";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function EditProfileModal({
  initialName,
  initialBio,
  initialUsername,
  initialAvatarUrl,
  initialWeight,
  initialHeight,
}: {
  initialName: string;
  initialBio: string;
  initialUsername?: string | null;
  initialAvatarUrl?: string | null;
  initialWeight?: number | null;
  initialHeight?: number | null;
}) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [weightKg, setWeightKg] = useState(initialWeight ? String(initialWeight) : "");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCm, setHeightCm] = useState(initialHeight ? String(initialHeight) : "");
  const [heightFt, setHeightFt] = useState(initialHeight ? String(Math.floor(initialHeight / 30.48)) : "");
  const [heightIn, setHeightIn] = useState(initialHeight ? String(Math.round((initialHeight / 2.54) % 12)) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 400);
      setNewAvatarUrl(await uploadToCloudinary(dataUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process that photo.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function save() {
    if (!USERNAME_PATTERN.test(username)) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores.");
      return;
    }
    setSaving(true);
    setError(null);
    let finalHeightCm = heightCm;
    if (heightUnit === "ft" && heightFt) {
      const inches = heightIn ? parseInt(heightIn) : 0;
      finalHeightCm = String(Math.round((parseInt(heightFt) * 12 + inches) * 2.54));
    }

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          username,
          ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {}),
          weightKg: weightKg ? Number(weightKg) : null,
          heightCm: finalHeightCm ? Number(finalHeightCm) : null,
        }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save. Please try again.");
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
              <div className="flex justify-center mb-1">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="relative"
                  aria-label="Change profile picture"
                >
                  <Avatar src={newAvatarUrl ?? initialAvatarUrl} name={name} size={72} />
                  {avatarUploading && (
                    <span className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-momentum text-midnight flex items-center justify-center border-2 border-midnight-raised">
                    <Camera className="w-3 h-3" />
                  </span>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarSelect} />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-momentum/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-white/50 mb-1.5 block">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  minLength={3}
                  maxLength={20}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-white/50 mb-1.5 block">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-momentum/50"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-white/50">Height</label>
                    <div className="flex bg-midnight border border-border-ichor rounded-lg overflow-hidden text-[10px]">
                      <button
                        type="button"
                        onClick={() => setHeightUnit("cm")}
                        className={`px-2 py-0.5 ${heightUnit === "cm" ? "bg-white/20 text-white font-bold" : "text-white/50"}`}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeightUnit("ft")}
                        className={`px-2 py-0.5 ${heightUnit === "ft" ? "bg-white/20 text-white font-bold" : "text-white/50"}`}
                      >
                        ft/in
                      </button>
                    </div>
                  </div>
                  {heightUnit === "cm" ? (
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-momentum/50"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="relative">
                        <input
                          type="number"
                          value={heightFt}
                          onChange={(e) => setHeightFt(e.target.value)}
                          placeholder="ft"
                          className="w-full bg-midnight border border-border-ichor rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-momentum/50"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={heightIn}
                          onChange={(e) => setHeightIn(e.target.value)}
                          placeholder="in"
                          className="w-full bg-midnight border border-border-ichor rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-momentum/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {error && <p className="text-xs text-ignite">{error}</p>}
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
