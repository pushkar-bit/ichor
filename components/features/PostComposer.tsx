"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Upload, X, ChevronDown, Loader2, HeartPulse, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Zone = { id: string; name: string };

const ACTIVITIES = ["RUN", "WALK", "CYCLE"] as const;

async function resizeToDataUrl(file: File, maxWidth = 900): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

export function PostComposer({ zones }: { zones: Zone[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [sourceType, setSourceType] = useState<"MANUAL" | "OCR_SCREENSHOT" | "HEALTH_SYNC">("MANUAL");
  const [activityType, setActivityType] = useState<(typeof ACTIVITIES)[number]>("RUN");
  const [distanceKm, setDistanceKm] = useState("5.0");
  const [durationMin, setDurationMin] = useState("28");
  const [caloriesBurned, setCaloriesBurned] = useState("320");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [dietOpen, setDietOpen] = useState(false);
  const [dietText, setDietText] = useState("");
  const [dietResult, setDietResult] = useState<{
    classification: "CLEAN" | "CHEAT" | "NEUTRAL";
    estimatedCalories: number;
    suggestion: string;
  } | null>(null);
  const [dietLoading, setDietLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
    const urls = await Promise.all(files.map((f) => resizeToDataUrl(f)));
    setPhotos((prev) => [...prev, ...urls].slice(0, 5));
    e.target.value = "";
  }

  async function handleScreenshotSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setSourceType("OCR_SCREENSHOT");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/workouts/ocr", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        setActivityType(data.extracted.activityType);
        setDistanceKm(String(data.extracted.distanceKm));
        setDurationMin(String(Math.round(data.extracted.durationSeconds / 60)));
        setCaloriesBurned(String(data.extracted.caloriesBurned));
        setScreenshotUrl(data.screenshotUrl);
      }
    } finally {
      setOcrLoading(false);
      e.target.value = "";
    }
  }

  function simulateHealthSync() {
    setSourceType("HEALTH_SYNC");
    setScreenshotUrl(null);
    const distance = Math.round((3 + Math.random() * 8) * 10) / 10;
    const duration = Math.round(distance * (5 + Math.random() * 1.2));
    setActivityType("RUN");
    setDistanceKm(String(distance));
    setDurationMin(String(duration));
    setCaloriesBurned(String(Math.round(distance * 62)));
  }

  function detectLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Location unavailable — pick a zone manually below.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`/api/location/detect?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          if (res.ok) {
            const cityLine = [data.district, data.city].filter(Boolean).join(", ");
            setLocationLabel(cityLine || "Location detected");
            if (data.zone) setZoneId(data.zone.id);
          } else {
            setLocationError("Could not resolve location — pick a zone manually below.");
          }
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocationError("Location unavailable — pick a zone manually below.");
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }

  async function analyzeDiet() {
    if (!dietText.trim()) return;
    setDietLoading(true);
    try {
      const res = await fetch("/api/coach/diet-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: dietText }),
      });
      if (res.ok) setDietResult(await res.json());
    } finally {
      setDietLoading(false);
    }
  }

  async function submit() {
    setError(null);
    if (photos.length === 0) {
      setError("Add at least one photo before posting.");
      return;
    }
    const distance = parseFloat(distanceKm);
    const duration = parseFloat(durationMin) * 60;
    const calories = parseInt(caloriesBurned, 10);
    if (!distance || !duration || !calories) {
      setError("Fill in distance, duration, and calories.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType,
          distanceKm: distance,
          durationSeconds: duration,
          avgPaceMinPerKm: activityType === "RUN" ? Math.round((duration / 60 / distance) * 100) / 100 : null,
          caloriesBurned: calories,
          sourceType,
          screenshotUrl,
          caption,
          photoUrls: photos,
          locationZoneId: zoneId || null,
          isPublic,
          dietDescription: dietResult ? dietText : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      const data = await res.json();
      router.push(`/post/${data.postId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24">
      <h1 className="font-display italic font-bold text-3xl mb-6">Post a workout</h1>

      {/* Import method */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={simulateHealthSync}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-xl border",
            sourceType === "HEALTH_SYNC" ? "border-lime bg-lime/10 text-lime" : "border-border-ichor text-white/60",
          )}
        >
          <HeartPulse className="w-4 h-4" /> Sync from Health
        </button>
        <button
          onClick={() => screenshotInputRef.current?.click()}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-xl border",
            sourceType === "OCR_SCREENSHOT" ? "border-momentum bg-momentum/10 text-momentum" : "border-border-ichor text-white/60",
          )}
        >
          {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Screenshot
        </button>
        <input ref={screenshotInputRef} type="file" accept="image/*" hidden onChange={handleScreenshotSelect} />
      </div>

      {/* Stats preview / manual entry */}
      <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex items-center gap-2">
          {ACTIVITIES.map((a) => (
            <button
              key={a}
              onClick={() => setActivityType(a)}
              className={cn(
                "flex-1 text-xs font-semibold py-2 rounded-lg border",
                activityType === a ? "border-momentum bg-momentum/10 text-momentum" : "border-border-ichor text-white/50",
              )}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Distance (km)" value={distanceKm} onChange={setDistanceKm} />
          <Field label="Duration (min)" value={durationMin} onChange={setDurationMin} />
          <Field label="Calories" value={caloriesBurned} onChange={setCaloriesBurned} />
        </div>
        {screenshotUrl && (
          <div className="flex items-center gap-2 text-xs text-white/50 border border-border-ichor rounded-lg p-2">
            <Camera className="w-3.5 h-3.5" /> Screenshot attached as proof
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="mb-4">
        <label className="text-xs font-medium text-white/50 mb-2 block">Photos (required, max 5)</label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-midnight-card">
              <Image src={p} alt="" fill unoptimized className="object-cover" />
              <button
                onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {photos.length < 5 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-border-ichor flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60"
            >
              <Upload className="w-5 h-5" />
              <span className="text-[10px]">Add</span>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoSelect} />
      </div>

      {/* Caption */}
      <div className="mb-4">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 300))}
          placeholder="How'd it feel out there?"
          rows={3}
          className="w-full bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-momentum/50 resize-none"
        />
        <div className="text-right text-[11px] text-white/30">{caption.length}/300</div>
      </div>

      {/* Zone picker */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/50 block">Where did you work out?</label>
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            className="inline-flex items-center gap-1 text-xs font-medium text-momentum disabled:opacity-50"
          >
            {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
            Detect my location
          </button>
        </div>
        {locationLabel && <p className="text-xs text-lime mb-2">📍 {locationLabel}</p>}
        {locationError && <p className="text-xs text-white/40 mb-2">{locationError}</p>}
        <select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          className="w-full bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum/50"
        >
          <option value="">No zone tag</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      {/* Diet honesty card */}
      <div className="mb-4 border border-border-ichor rounded-2xl overflow-hidden">
        <button
          onClick={() => setDietOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-midnight-raised"
        >
          <span className="text-sm font-semibold">Fuel Log — optional but rewarded</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", dietOpen && "rotate-180")} />
        </button>
        {dietOpen && (
          <div className="p-4 space-y-3">
            <textarea
              value={dietText}
              onChange={(e) => setDietText(e.target.value)}
              placeholder="What did you eat today?"
              rows={2}
              className="w-full bg-midnight border border-border-ichor rounded-xl px-4 py-3 text-sm placeholder:text-white/30 focus:outline-none focus:border-momentum/50 resize-none"
            />
            <button
              onClick={analyzeDiet}
              disabled={dietLoading || !dietText.trim()}
              className="text-sm font-medium bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg disabled:opacity-40 inline-flex items-center gap-2"
            >
              {dietLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Analyze diet
            </button>
            {dietResult && (
              <div
                className={cn(
                  "text-sm rounded-xl p-3 border",
                  dietResult.classification === "CLEAN" && "border-lime/30 bg-lime/10 text-lime",
                  dietResult.classification === "CHEAT" && "border-ignite/30 bg-ignite/10 text-ignite",
                  dietResult.classification === "NEUTRAL" && "border-white/20 bg-white/5 text-white/60",
                )}
              >
                <div className="font-semibold mb-1">
                  {dietResult.classification} · ~{dietResult.estimatedCalories} cal
                </div>
                <p className="text-xs opacity-80">{dietResult.suggestion}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Public toggle */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-white/60">Post publicly to the club</span>
        <button
          onClick={() => setIsPublic((v) => !v)}
          className={cn("w-11 h-6 rounded-full relative transition-colors", isPublic ? "bg-momentum" : "bg-white/15")}
        >
          <span
            className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
              isPublic ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {error && <p className="text-sm text-ignite mb-4">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-momentum text-midnight font-semibold py-3.5 rounded-full disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Post to ICHOR
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wide text-white/40 block mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="w-full bg-midnight border border-border-ichor rounded-lg px-2.5 py-2 text-sm text-center focus:outline-none focus:border-momentum/50"
      />
    </div>
  );
}
