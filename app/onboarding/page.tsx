"use client";

import { useState } from "react";
import { Loader2, ArrowRight, Scale, Ruler, AtSign } from "lucide-react";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function OnboardingPage() {
  const [username, setUsername] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let finalHeightCm = heightCm;
    if (heightUnit === "ft") {
      if (!heightFt) {
        setError("Please fill in feet.");
        return;
      }
      const inches = heightIn ? parseInt(heightIn) : 0;
      finalHeightCm = String(Math.round((parseInt(heightFt) * 12 + inches) * 2.54));
    }

    if (!weightKg || !finalHeightCm) {
      setError("Please fill in all fields.");
      return;
    }

    if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg, heightCm: finalHeightCm, username: username.trim().toLowerCase() }),
      });
      if (res.ok) {
        // Force hard refresh to update server-side layout redirect checks
        window.location.href = "/feed";
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm bg-midnight-raised border border-border-ichor rounded-3xl p-6">
        <h1 className="font-display italic font-bold text-3xl mb-2">Welcome to ICHOR.</h1>
        <p className="text-sm text-white/60 mb-6">
          Before you hit the ground running, we need two quick metrics. This helps our AI accurately calculate your calorie burn from workouts.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="e.g. arjun_runs"
              required
              minLength={3}
              maxLength={20}
              className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 70"
              required
              className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-white/50 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" /> Height
              </label>
              <div className="flex bg-midnight border border-border-ichor rounded-lg overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setHeightUnit("cm")}
                  className={`px-3 py-1 ${heightUnit === "cm" ? "bg-momentum text-midnight font-bold" : "text-white/60"}`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => setHeightUnit("ft")}
                  className={`px-3 py-1 ${heightUnit === "ft" ? "bg-momentum text-midnight font-bold" : "text-white/60"}`}
                >
                  ft / in
                </button>
              </div>
            </div>

            {heightUnit === "cm" ? (
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 175"
                required
                className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    placeholder="5"
                    required
                    className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-medium text-white/30">ft</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                    placeholder="9"
                    className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-medium text-white/30">in</span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-ignite">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-momentum text-midnight font-bold py-3.5 rounded-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                Let's go <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
