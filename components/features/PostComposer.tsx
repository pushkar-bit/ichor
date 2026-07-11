"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import confetti from "canvas-confetti";
import { Camera, Upload, X, ChevronDown, Loader2, MapPin, Trophy, Swords, Zap, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { resizeToDataUrl } from "@/lib/image";
import { uploadToCloudinary } from "@/lib/cloudinaryClient";

type Zone = { id: string; name: string; ownerId: string | null; ownerName: string | null; ownerAvatarUrl: string | null };
type ContestChoice = "ATTACK" | "EXPLOIT" | "IGNORE";

export function PostComposer({ zones, currentUserId }: { zones: Zone[]; currentUserId: string | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Workout stats are initially populated by OCR-extracting a screenshot,
  // but they are now editable in case the AI hallucinates or misses a decimal.
  const [activityType, setActivityType] = useState<"RUN" | "WALK" | "CYCLE" | null>(null);
  const [distanceKm, setDistanceKm] = useState("");
  const [durationString, setDurationString] = useState("");
  const [avgPace, setAvgPace] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [caption, setCaption] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Set once the user resolves the invasion overlay for the currently selected zone.
  // Cleared whenever zoneId changes so re-picking the same enemy zone prompts again.
  const [contestChoice, setContestChoice] = useState<ContestChoice | null>(null);
  const contestedZone = zones.find((z) => z.id === zoneId && z.ownerId && z.ownerId !== currentUserId) ?? null;
  const showInvasionOverlay = Boolean(contestedZone) && contestChoice === null;

  function pickZone(id: string) {
    setZoneId(id);
    setContestChoice(null);
  }

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
  const [pbMessage, setPbMessage] = useState<string | null>(null);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
    e.target.value = "";
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      // Process each file independently — Promise.all would let one bad file (e.g. a HEIC
      // photo createImageBitmap can't decode in some browsers) silently drop the whole batch
      // with zero feedback, which is exactly what "photo picked but never appears" looks like.
      const results = await Promise.allSettled(
        files.map(async (f) => {
          const dataUrl = await resizeToDataUrl(f);
          return await uploadToCloudinary(dataUrl);
        })
      );
      const urls = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value);
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      if (urls.length > 0) {
        setPhotos((prev) => [...prev, ...urls].slice(0, 5));
      }
      if (failures.length > 0) {
        // Surface the real reason (e.g. "couldn't convert from HEIC") instead of a generic
        // message — this is the only feedback we get since the picker itself gives nothing.
        const reasons = [...new Set(failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason))))];
        setError(reasons.join(" "));
      }
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function processScreenshot(file: File) {
    setOcrLoading(true);
    setError(null);
    try {
      // Convert everything (HEIF, PNG, JPG) to a standardized JPEG to ensure OCR accuracy and save bandwidth
      const dataUrl = await resizeToDataUrl(file, 1500);
      const cloudinaryUrl = await uploadToCloudinary(dataUrl);

      const res = await fetch("/api/workouts/ocr", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: cloudinaryUrl }) 
      });
      
      if (!res.ok) {
        let msg = "Failed to extract screenshot data.";
        try {
          const errData = await res.json();
          if (errData.error) msg = errData.error;
        } catch {}
        setError(msg);
        return;
      }
      
      const data = await res.json();
        setActivityType(data.extracted.activityType);
        setDistanceKm(String(data.extracted.distanceKm ?? 0));
        if (data.extracted.durationSeconds) {
          const totalSecs = data.extracted.durationSeconds;
          const m = Math.floor(totalSecs / 60);
          const s = totalSecs % 60;
          setDurationString(s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : String(m));
        } else {
          setDurationString("");
        }
        if (data.extracted.avgPaceMinPerKm) {
          setAvgPace(String(data.extracted.avgPaceMinPerKm));
        } else if (data.extracted.distanceKm > 0 && data.extracted.durationSeconds > 0) {
          const calcPace = Math.round((data.extracted.durationSeconds / 60 / data.extracted.distanceKm) * 100) / 100;
          setAvgPace(String(calcPace));
        }
        if (data.extracted.runName) {
          setCaption(data.extracted.runName);
        }
        setCaloriesBurned(String(data.extracted.caloriesBurned ?? 0));
        setScreenshotUrl(data.screenshotUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process that screenshot.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleScreenshotSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processScreenshot(file);
    e.target.value = "";
  }

  useEffect(() => {
    let dragCounter = 0;

    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragCounter++;
      setIsDragging(true);
    }
    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
    }
    function onDragLeave(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    }
    function onDrop(e: DragEvent) {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        processScreenshot(file);
      }
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);


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
            if (data.zone) pickZone(data.zone.id);
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
    if (!dietText.trim()) return dietResult;
    setDietLoading(true);
    try {
      const res = await fetch("/api/coach/diet-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: dietText }),
      });
      if (res.ok) {
        const result = await res.json();
        setDietResult(result);
        return result;
      }
      return dietResult;
    } finally {
      setDietLoading(false);
    }
  }

  async function submit() {
    setError(null);
    if (!screenshotUrl || !activityType) {
      setError("Upload a screenshot to extract your workout stats before posting.");
      return;
    }
    if (showInvasionOverlay) {
      setError("Choose Attack, Exploit, or Ignore for the territory you tagged.");
      return;
    }
    const distance = parseFloat(distanceKm);
    let duration = 0;
    if (durationString.includes(":")) {
      const [m, s] = durationString.split(":");
      duration = (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
    } else {
      duration = parseFloat(durationString) * 60;
    }
    const calories = parseInt(caloriesBurned, 10);

    if (isNaN(distance) || distance <= 0) {
      setError("Please enter a valid distance (km).");
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      setError("Please enter a valid duration (minutes).");
      return;
    }
    if (isNaN(calories) || calories <= 0) {
      setError("Please enter valid calories burned.");
      return;
    }

    setSubmitting(true);
    try {
      // If the user typed a fuel log but never clicked "Analyze diet", run it now
      // rather than silently dropping what they wrote.
      const finalDietResult = dietResult ?? (await analyzeDiet());

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType,
          distanceKm: distance,
          durationSeconds: duration,
          avgPaceMinPerKm: avgPace ? parseFloat(avgPace) : activityType === "RUN" && distance > 0 ? Math.round((duration / 60 / distance) * 100) / 100 : null,
          caloriesBurned: calories,
          sourceType: "OCR_SCREENSHOT",
          screenshotUrl,
          caption,
          // If the user added their own photos, they appear first (main feed image).
          // The screenshot always goes at the end — stored for verification but not the hero.
          photoUrls: photos.length > 0
            ? [...photos, ...(screenshotUrl ? [screenshotUrl] : [])]
            : screenshotUrl ? [screenshotUrl] : [],
          locationZoneId: zoneId || null,
          contestChoice: contestedZone ? contestChoice : undefined,
          isPublic,
          dietDescription: finalDietResult ? dietText : undefined,
        }),
      });
      if (!res.ok) {
        let message = "Something went wrong.";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {
          message = `Server error (${res.status}). Please try again.`;
        }
        setError(message);
        return;
      }
      const data = await res.json();

      const pb = data.newPersonalBests;
      const message = pb?.distance && pb?.pace
        ? "New personal best — longest distance and fastest 5K pace yet!"
        : pb?.distance
        ? "New personal best — longest distance yet!"
        : pb?.pace
        ? "New personal best — fastest 5K pace yet!"
        : null;

      if (message) {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ["#D4AF37", "#AE93F4", "#ffffff"], disableForReducedMotion: true, zIndex: 9999 });
        setPbMessage(message);
        // Let the celebration actually be seen before navigating away from this screen.
        await new Promise((resolve) => setTimeout(resolve, 1700));
      }

      router.push(`/post/${data.postId}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 relative">
      {pbMessage && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-x-4 top-6 z-[9999] flex justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 bg-midnight-raised border border-[#D4AF37]/50 rounded-2xl px-4 py-3 shadow-2xl max-w-sm">
            <Trophy className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <span className="text-sm font-semibold text-white">{pbMessage}</span>
          </div>
        </div>,
        document.body
      )}

      {showInvasionOverlay && contestedZone && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="text-center p-6 sm:p-8 border border-ignite/40 rounded-3xl bg-midnight-raised max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 border-2 border-ignite/60 bg-midnight-card relative">
              {contestedZone.ownerAvatarUrl ? (
                <Image src={contestedZone.ownerAvatarUrl} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-ignite">
                  {(contestedZone.ownerName ?? "?").charAt(0)}
                </div>
              )}
            </div>
            <h2 className="font-display italic font-bold text-2xl text-white mb-1">
              ⚔️ You entered {contestedZone.ownerName ?? "an athlete"}&apos;s territory

            </h2>
            <p className="text-white/50 text-sm mb-6">{contestedZone.name} is currently held by someone else. What do you want to do?</p>
            <div className="space-y-2.5">
              <button
                onClick={() => setContestChoice("ATTACK")}
                className="w-full flex items-center justify-center gap-2 bg-ignite text-midnight font-semibold py-3 rounded-full"
              >
                <Swords className="w-4 h-4" /> Attack — go for the zone
              </button>
              <button
                onClick={() => setContestChoice("EXPLOIT")}
                className="w-full flex items-center justify-center gap-2 bg-white/10 text-white font-semibold py-3 rounded-full"
              >
                <Zap className="w-4 h-4" /> Exploit — half score, no fight
              </button>
              <button
                onClick={() => setContestChoice("IGNORE")}
                className="w-full flex items-center justify-center gap-2 text-white/50 font-medium py-2.5 rounded-full"
              >
                <ShieldOff className="w-4 h-4" /> Ignore — don&apos;t tag a zone
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isDragging && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/90 backdrop-blur-md pointer-events-none p-4">
          <div className="text-center p-6 sm:p-10 border-2 border-dashed border-momentum rounded-3xl bg-momentum/10 max-w-lg w-full shadow-2xl my-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-momentum/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-momentum" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold italic font-display text-white mb-2 sm:mb-3">Drop your screenshot</h2>
            <p className="text-white/60 text-base sm:text-lg max-w-[350px] mx-auto">
              Release to instantly extract distance, duration, and pace using AI.
            </p>
          </div>
        </div>,
        document.body
      )}

      <h1 className="font-display italic font-bold text-3xl mb-6">Post a workout</h1>

      {/* Screenshot upload — the only source of workout stats */}
      <div className="mb-4">
        <button
          onClick={() => screenshotInputRef.current?.click()}
          disabled={ocrLoading}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 text-sm font-medium py-2.5 rounded-xl border disabled:opacity-60",
            screenshotUrl ? "border-momentum bg-momentum/10 text-momentum" : "border-border-ichor text-white/60",
          )}
        >
          {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {ocrLoading ? "Reading screenshot..." : screenshotUrl ? "Replace screenshot" : "Upload workout screenshot"}
        </button>
        <input ref={screenshotInputRef} type="file" accept="image/*" hidden onChange={handleScreenshotSelect} />
      </div>

      {/* Stats — read-only, extracted from the screenshot */}
      {screenshotUrl && activityType && (
        <div className="bg-midnight-raised border border-border-ichor rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-momentum">
            <Camera className="w-3.5 h-3.5" /> {activityType} · extracted from screenshot
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatInput label="Distance (km)" value={distanceKm} onChange={setDistanceKm} />
            <StatInput label="Duration (mm:ss)" value={durationString} onChange={setDurationString} />
            <StatInput label="Pace (min/km)" value={avgPace} onChange={setAvgPace} />
            <StatInput label="Calories" value={caloriesBurned} onChange={setCaloriesBurned} />
          </div>
        </div>
      )}
      {!screenshotUrl && (
        <p className="text-xs text-white/30 mb-4 -mt-2">Upload a screenshot of your run to auto-fill distance, duration, pace, and calories.</p>
      )}

      {/* Photos */}
      <div className="mb-4">
        <label className="text-xs font-medium text-white/50 mb-2 block">
          {photos.length > 0
            ? `Photos · first photo shown on feed (${photos.length}/5)`
            : "Add a photo — it will be your main feed image (optional)"}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-midnight-card">
              <Image src={p} alt="" fill sizes="33vw" className="object-cover" />
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
              disabled={uploadingPhotos}
              className="aspect-square rounded-xl border border-dashed border-border-ichor flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 disabled:opacity-50"
            >
              {uploadingPhotos ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Add</span>
                </>
              )}
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
          onChange={(e) => pickZone(e.target.value)}
          className="w-full bg-midnight-raised border border-border-ichor rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-momentum/50"
        >
          <option value="">No zone tag</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
              {z.ownerId && z.ownerId !== currentUserId ? ` — held by ${z.ownerName ?? "another athlete"}` : ""}
            </option>
          ))}
        </select>
        {contestedZone && contestChoice && (
          <p className="text-xs text-ignite mt-2">
            {contestChoice === "ATTACK" && `⚔️ Attacking ${contestedZone.ownerName ?? "the owner"}'s territory.`}
            {contestChoice === "EXPLOIT" && "🩸 Exploiting this zone — half score, no ownership change."}
            {contestChoice === "IGNORE" && "This run won't tag a territory."}
          </p>
        )}
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
        <span className="text-sm text-white/60">Post publicly to the clan</span>
        <button
          onClick={() => setIsPublic((v) => !v)}
          className={cn("w-11 h-6 rounded-full relative transition-colors shrink-0", isPublic ? "bg-momentum" : "bg-white/15")}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
              isPublic ? "translate-x-5" : "translate-x-0",
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

function StatInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bg-midnight border border-border-ichor rounded-lg px-2.5 py-1.5 flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-wide text-white/40 mb-0.5 text-center">{label}</div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="-"
        className="w-full bg-transparent text-sm font-semibold text-center focus:outline-none focus:text-momentum"
      />
    </div>
  );
}
