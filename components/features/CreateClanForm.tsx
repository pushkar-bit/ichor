"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_COLORS = ["#AE93F4", "#FDA2DE", "#D7F24C", "#FF5E1A", "#8a72d9", "#f5f3f6", "#6b6568", "#231F20"];

export function CreateClanForm({ redirectTo }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [dietPact, setDietPact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim() || name.length > 30) return setError("Name must be 1-30 characters.");
    if (tag.length !== 4) return setError("Tag must be exactly 4 characters.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, color, dietPactDescription: dietPact }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      router.push(redirectTo ?? `/clans/${data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="font-display italic font-bold text-3xl mb-6">Create a clan</h1>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Clan name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="Iron Lungs"
            className="w-full bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum/50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Tag (exactly 4 characters)</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="IRON"
            className="w-full bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 text-sm uppercase tracking-widest focus:outline-none focus:border-momentum/50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Color</label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn("w-8 h-8 rounded-full", color === c && "ring-2 ring-offset-2 ring-offset-midnight ring-white")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-white/50 mb-1.5 block">Diet Pact (optional)</label>
          <input
            value={dietPact}
            onChange={(e) => setDietPact(e.target.value)}
            placeholder="No sugar this week"
            className="w-full bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum/50"
          />
        </div>

        {error && <p className="text-sm text-ignite">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-momentum text-midnight font-semibold py-3.5 rounded-full disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Found the clan
        </button>
      </div>
    </div>
  );
}
