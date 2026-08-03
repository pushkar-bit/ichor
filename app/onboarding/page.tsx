"use client";

import { useState } from "react";
import { Loader2, ArrowRight, Scale, Ruler, AtSign, Link2, Sparkles, Footprints, Cake } from "lucide-react";

const MIN_AGE_YEARS = 5;
const MAX_AGE_YEARS = 100;

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function OnboardingPage() {
  // "profile" is the weight/height/username form; "newRunner" asks whether this is someone's
  // first time running (drives Beginner-Friendly Mode — see lib/beginnerProgram.ts and the
  // [data-mode="beginner"] theme rules in globals.css); "strava" is a final, skippable step
  // shown only when the account doesn't already have Strava connected (someone who signed up
  // via Strava itself is already connected by the time they reach here).
  const [step, setStep] = useState<"profile" | "newRunner" | "strava">("profile");
  const [username, setUsername] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolvedHeightCm(): string | null {
    if (heightUnit === "cm") return heightCm || null;
    if (!heightFt) return null;
    const inches = heightIn ? parseInt(heightIn) : 0;
    return String(Math.round((parseInt(heightFt) * 12 + inches) * 2.54));
  }

  function continueFromProfile(e: React.FormEvent) {
    e.preventDefault();
    const finalHeightCm = resolvedHeightCm();

    if (heightUnit === "ft" && !heightFt) {
      setError("Please fill in feet.");
      return;
    }
    if (!weightKg || !finalHeightCm) {
      setError("Please fill in all fields.");
      return;
    }
    if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores.");
      return;
    }
    if (!birthDate) {
      setError("Please enter your birth date.");
      return;
    }
    const ageYears = (Date.now() - new Date(birthDate).getTime()) / (365.25 * 86400e3);
    if (ageYears < MIN_AGE_YEARS || ageYears > MAX_AGE_YEARS) {
      setError("Please double-check your birth date.");
      return;
    }

    setError(null);
    setStep("newRunner");
  }

  async function chooseNewRunner(isNew: boolean) {
    setBeginnerMode(isNew);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg,
          heightCm: resolvedHeightCm(),
          username: username.trim().toLowerCase(),
          birthDate,
          beginnerMode: isNew,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({ stravaConnected: false }));
        if (data.stravaConnected) {
          // Force hard refresh to update server-side layout redirect checks
          window.location.href = isNew ? "/start" : "/feed";
        } else {
          setLoading(false);
          setStep("strava");
        }
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save. Please try again.");
        setLoading(false);
        setStep("profile");
      }
    } catch (err) {
      setError("Network error.");
      setLoading(false);
      setStep("profile");
    }
  }

  if (step === "newRunner") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
        <div className="w-full max-w-sm bg-midnight-raised border border-border-ichor rounded-3xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-momentum/15 flex items-center justify-center mx-auto mb-4">
            <Footprints className="w-7 h-7 text-momentum" />
          </div>
          <h1 className="font-display italic font-bold text-2xl mb-2">One quick thing.</h1>
          <p className="text-sm text-white/60 mb-2">Are you completely new to running?</p>
          <p className="text-xs text-white/40 mb-6">
            Answering yes switches your account into <span className="text-momentum font-semibold">Beginner-Friendly Mode</span> — a
            calmer, guided version of ICHOR built for people taking their first steps. We&apos;ll walk you from your
            very first one-minute jog all the way to <span className="text-momentum font-semibold">running a full 5K</span>,
            in gentle stages paced to how you&apos;re actually doing, with plain explanations for everything you see
            and a warmer feel throughout. Nothing is locked in: you can switch back anytime from your profile.
          </p>
          {error && <p className="text-xs text-ignite mb-3">{error}</p>}
          <div className="space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => chooseNewRunner(true)}
              className="w-full flex items-center justify-center gap-2 bg-momentum text-midnight font-bold py-3.5 rounded-full disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Yes, I&apos;m just starting out</>}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => chooseNewRunner(false)}
              className="w-full text-sm font-semibold text-white/60 hover:text-white py-2.5 disabled:opacity-50"
            >
              No, I&apos;ve been running a while
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "strava") {
    const nextDestination = beginnerMode ? "/start" : "/feed";
    return (
      <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
        <div className="w-full max-w-sm bg-midnight-raised border border-border-ichor rounded-3xl p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#FC4C02]/15 flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-7 h-7 text-[#FC4C02]" />
          </div>
          {/* This is the last step before the feed, and territory is the thing worth arriving
              with. It also happens to be the hard gate: only GPS-verified runs can claim land
              (see isTerritoryEligibleRun), so a runner who skips this can't play the map. */}
          <h1 className="font-display italic font-bold text-2xl mb-2">Your runs draw the map.</h1>
          <p className="text-sm text-white/60 mb-2">
            Connect Strava and every run syncs here automatically — and the ground it covers becomes your territory,
            on a real map, held against everyone else running the same streets.
          </p>
          <p className="text-xs text-white/35 mb-6">Runs logged without GPS still count for points — they just can&apos;t take land.</p>
          <a
            href={`/api/integrations/strava/connect?returnTo=${nextDestination}`}
            className="w-full flex items-center justify-center gap-2 bg-[#FC4C02] text-white font-bold py-3.5 rounded-full mb-3"
          >
            <Link2 className="w-4 h-4" /> Connect Strava
          </a>
          <button
            type="button"
            onClick={() => { window.location.href = nextDestination; }}
            className="w-full text-sm text-white/40 hover:text-white/60 py-2"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="w-full max-w-sm bg-midnight-raised border border-border-ichor rounded-3xl p-6">
        <h1 className="font-display italic font-bold text-3xl mb-2">Welcome to ICHOR.</h1>
        <p className="text-sm text-white/60 mb-6">
          Before you hit the ground running, we need two quick metrics. This helps our AI accurately calculate your calorie burn from workouts.
        </p>

        <form onSubmit={continueFromProfile} className="space-y-4">
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

          <div>
            <label className="text-xs font-medium text-white/50 block mb-1.5 flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5" /> Birth date
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum [color-scheme:dark]"
            />
            <p className="text-[11px] text-white/30 mt-1">Helps us pace your plan sensibly — and we&apos;ll wish you a happy birthday 🎂</p>
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
