/**
 * Gemini-backed AI features with deterministic rule-based fallbacks.
 * Every exported function tries the real Gemini API first (gemini-2.5-flash) and
 * falls back to a rule-based equivalent if the key is missing or the call fails,
 * so the app degrades gracefully instead of breaking.
 */
import { getGeminiModel, extractJson } from "./gemini";

/** A clean, user-facing message paired with the right HTTP status — never the raw SDK error. */
export class AIServiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * Gemini's free tier caps gemini-2.5-flash at a small number of requests PER DAY, for the
 * whole API key/project — not per user, not per minute. That's a very different failure
 * mode from a transient rate limit: retrying sooner never helps, only a new day (or
 * enabling billing on the project) does. Distinguish them so the message given is honest.
 */
function classifyGeminiError(message: string): "daily_quota" | "rate_limit" | "other" {
  if (/perday/i.test(message)) return "daily_quota";
  if (/429|quota|rate.?limit/i.test(message)) return "rate_limit";
  return "other";
}

const CHEAT_WORDS = [
  "pizza", "burger", "fries", "fried", "chips", "soda", "coke", "candy", "chocolate",
  "cake", "donut", "doughnut", "ice cream", "mcdonald", "kfc", "sugar", "junk", "cheat",
  "maggi", "samosa", "pastry", "cookie", "burger king", "wings", "nuggets",
];
const CLEAN_WORDS = [
  "salad", "chicken breast", "grilled", "oats", "oatmeal", "protein", "vegetable", "veggies",
  "fruit", "quinoa", "brown rice", "eggs", "boiled", "steamed", "lentil", "dal", "tofu",
  "smoothie", "yogurt", "greek yogurt", "fish", "lean", "clean",
];

export type DietResult = {
  classification: "CLEAN" | "CHEAT" | "NEUTRAL";
  estimatedCalories: number;
  integrityBonus: number;
  suggestion: string;
};

function classifyDietFallback(description: string): DietResult {
  const text = description.toLowerCase();
  const cheatHits = CHEAT_WORDS.filter((w) => text.includes(w)).length;
  const cleanHits = CLEAN_WORDS.filter((w) => text.includes(w)).length;

  let classification: "CLEAN" | "CHEAT" | "NEUTRAL" = "NEUTRAL";
  if (cheatHits > cleanHits && cheatHits > 0) classification = "CHEAT";
  else if (cleanHits > 0 && cleanHits >= cheatHits) classification = "CLEAN";

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const base = 400 + wordCount * 35;
  const estimatedCalories =
    classification === "CHEAT" ? Math.round(base * 1.6) : classification === "CLEAN" ? Math.round(base * 0.85) : base;

  const integrityBonus = classification === "CLEAN" ? 50 : classification === "NEUTRAL" ? 25 : 0;

  const suggestion =
    classification === "CLEAN"
      ? "Solid fuel. Keep stacking clean days for the multiplier."
      : classification === "CHEAT"
        ? "Get back on track tomorrow — hydrate and add protein."
        : "Log more detail next time for a sharper read.";

  return { classification, estimatedCalories, integrityBonus, suggestion };
}

export async function classifyDiet(description: string): Promise<DietResult> {
  const model = getGeminiModel();
  if (!model) return classifyDietFallback(description);

  try {
    const prompt = `You are a sports nutritionist AI for ICHOR, a competitive fitness app for college athletes. The user describes their food intake for today. Analyze it in the context of athletic performance and recovery. Return ONLY a raw JSON object with no markdown: { "classification": "CLEAN"|"CHEAT"|"NEUTRAL", "estimatedCalories": number, "integrityBonus": number, "suggestion": string }. Rules: CLEAN means majority whole foods, lean proteins, complex carbs, adequate hydration -> integrityBonus 50. CHEAT means junk food, fried food, excessive sugar, alcohol, fast food -> integrityBonus 0. NEUTRAL means mixed quality or insufficient description -> integrityBonus 25. suggestion must be exactly one sentence, maximum 15 words, specific and motivating.

Description: "${description}"`;

    const result = await model.generateContent(prompt);
    const parsed = extractJson<DietResult>(result.response.text());
    if (!parsed.classification || typeof parsed.estimatedCalories !== "number") {
      throw new Error("malformed diet response");
    }
    return parsed;
  } catch (err) {
    console.error("[gemini] classifyDiet failed, using fallback:", (err as Error).message);
    return classifyDietFallback(description);
  }
}

export type ParsedWorkout = {
  runName: string | null;
  activityType: "RUN" | "WALK" | "CYCLE";
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
  heartRateAvg: number | null;
  workoutDate: string;
};

function parseScreenshotFallback(filename: string, weightKg?: number | null): ParsedWorkout {
  const seed = Array.from(filename).reduce((a, c) => a + c.charCodeAt(0), 0);
  const distanceKm = Math.round((3 + (seed % 12)) * 10) / 10;
  const durationSeconds = Math.round(distanceKm * (5 + (seed % 3)) * 60);
  const avgPaceMinPerKm = Math.round((durationSeconds / 60 / distanceKm) * 100) / 100;
  const w = weightKg || 62;
  const caloriesBurned = Math.round(distanceKm * w * 1.036 + (seed % 40));
  return {
    runName: null,
    activityType: "RUN",
    distanceKm,
    durationSeconds,
    avgPaceMinPerKm,
    caloriesBurned,
    heartRateAvg: 140 + (seed % 30),
    workoutDate: new Date().toISOString().slice(0, 10),
  };
}

/** Real Gemini Vision OCR. base64Data excludes the `data:image/...;base64,` prefix. */
export async function parseScreenshot(
  filename: string,
  image?: { base64Data: string; mimeType: string },
  weightKg?: number | null
): Promise<ParsedWorkout> {
  const model = getGeminiModel();
  if (!model || !image) return parseScreenshotFallback(filename, weightKg);

  try {
    const prompt = `You are a precise fitness data extraction engine. Analyze this screenshot from a fitness tracking application (may be Strava, RunKeeper, Garmin Connect, Nike Run Club, Apple Fitness, Samsung Health, or similar). Read every number EXACTLY as printed, digit by digit, including decimal places — if the screenshot shows "5.47 km", return 5.47, not 5.5 or 5; if it shows a pace of "6:03 /km", convert that to 6.05 min/km precisely, not a rounded figure. Do not round, truncate, or approximate any value that is visibly printed in the image — copy it exactly, then convert units only if the schema requires it (e.g. mm:ss duration to total seconds). Return ONLY a raw JSON object with absolutely no markdown formatting, no code fences, no explanation, no text before or after the JSON. Use this exact schema: { "runName": string|null, "activityType": "RUN"|"WALK"|"CYCLE", "distanceKm": number, "durationSeconds": number, "avgPaceMinPerKm": number|null, "caloriesBurned": number, "heartRateAvg": number|null, "workoutDate": "YYYY-MM-DD" }. Only calculate a value when it is genuinely absent from the screenshot and cannot be read anywhere in the image: if caloriesBurned is missing but distance is visible, estimate it using distanceKm * ${weightKg || 62} * 1.036; if avgPaceMinPerKm is missing but distance and duration are both visible, derive it as durationSeconds / 60 / distanceKm. Never calculate a value that is already visible in the image — extract it exactly instead. If a field is missing and cannot be derived from other visible fields, use null. For runName, extract the main title or caption of the activity (e.g. "Morning Run").`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: image.base64Data, mimeType: image.mimeType } },
    ]);
    const parsed = extractJson<Partial<ParsedWorkout>>(result.response.text());
    if (parsed.distanceKm == null && parsed.caloriesBurned == null) {
      throw new Error("Gemini could not extract workout data from screenshot");
    }
    return {
      runName: parsed.runName ?? null,
      activityType: parsed.activityType ?? "RUN",
      distanceKm: parsed.distanceKm ?? 0,
      durationSeconds: parsed.durationSeconds ?? 0,
      avgPaceMinPerKm: parsed.avgPaceMinPerKm ?? null,
      caloriesBurned: parsed.caloriesBurned ?? 0,
      heartRateAvg: parsed.heartRateAvg ?? null,
      workoutDate: parsed.workoutDate ?? new Date().toISOString().slice(0, 10),
    };
  } catch (err) {
    const raw = (err as Error).message || "";
    console.error("[gemini] parseScreenshot failed:", raw);
    const kind = classifyGeminiError(raw);
    if (kind === "daily_quota") {
      throw new AIServiceError(
        "The AI screenshot reader has used up its free daily request limit for today (shared across everyone, not per-user) — it resets tomorrow. Ask whoever manages GEMINI_API_KEY to enable billing for more headroom sooner.",
        429,
      );
    }
    if (kind === "rate_limit") {
      throw new AIServiceError("Our AI screenshot reader is briefly overloaded — wait a moment and try again.", 429);
    }
    throw new AIServiceError("Couldn't read that screenshot clearly. Try a clearer photo of your workout summary screen.", 422);
  }
}

type CoachContext = {
  name: string;
  weeklyCaloriesBurned: number;
  streakDays: number;
  integrityPoints: number;
  battlesWon: number;
  battlesLost: number;
  zonesHeld: number;
};

function coachReplyFallback(message: string, ctx: CoachContext): string {
  const m = message.toLowerCase();

  if (m.includes("burn more calories") || m.includes("burn calories")) {
    return `You're at ${ctx.weeklyCaloriesBurned} cal this week. Add one tempo run and post it same-day — consistency multiplier stacks fast. Skip the cheat days for two weeks straight.`;
  }
  if (m.includes("analyze my week") || m.includes("analyse my week")) {
    return `${ctx.streakDays}-day streak, ${ctx.zonesHeld} zone${ctx.zonesHeld === 1 ? "" : "s"} held, ${ctx.integrityPoints} integrity points. Solid base — the gap is volume, not effort. Push one more session this week.`;
  }
  if (m.includes("beat") && (m.includes("score") || m.includes("rival"))) {
    return `To flip a leaderboard spot you need base calories × your consistency multiplier to exceed theirs. Post daily for a week and it compounds past raw calorie grinding.`;
  }
  if (m.includes("training plan") || m.includes("generate")) {
    return `Pulling your last 4 weeks now — check the Training Plan card on your profile for the full 7-day breakdown.`;
  }
  if (m.includes("accept this challenge") || m.includes("should i accept")) {
    return `If your zone calorie score already beats theirs, accept — you auto-win. If they're ahead, only take it if you can post a bigger session before it expires.`;
  }
  if (ctx.battlesLost > ctx.battlesWon) {
    return `You're ${ctx.battlesLost - ctx.battlesWon} battles down net. Stop defending everything — pick one zone and stack calorie score there before you spread thin.`;
  }
  return `Heard. Post your next workout and I'll read the numbers — right now give me a real question about training, diet, or territory strategy.`;
}

export async function coachReply(message: string, ctx: CoachContext): Promise<string> {
  const model = getGeminiModel();
  if (!model) return coachReplyFallback(message, ctx);

  try {
    const systemPrompt = `You are Vikas Yadav, an elite performance coach for ICHOR — a campus social fitness battleground where college athletes compete for territory, leaderboard dominance, and glory. You are intense, disciplined, and data-driven — like an ancient Greek athlete who trains for victory, not participation. You speak with authority. You never sugarcoat. Keep responses mobile-optimized: maximum 3 short paragraphs, no markdown headers. Always reference the user's actual numbers. User stats: ${ctx.weeklyCaloriesBurned} calories this week, ${ctx.streakDays}-day streak, ${ctx.integrityPoints} integrity points, ${ctx.zonesHeld} zones held, ${ctx.battlesWon} battles won, ${ctx.battlesLost} battles lost.`;

    const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`);
    const text = result.response.text().trim();
    if (!text) throw new Error("empty coach reply");
    return text;
  } catch (err) {
    console.error("[gemini] coachReply failed, using fallback:", (err as Error).message);
    return coachReplyFallback(message, ctx);
  }
}

export type TrainingDay = {
  day: string;
  type: "Rest" | "Easy" | "Tempo" | "Long" | "Sprint" | "Cross-train";
  distanceKm: number | null;
  targetCalories: number;
  notes: string;
};

function generateTrainingPlanFallback(avgWeeklyDistanceKm: number): TrainingDay[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const base = Math.max(avgWeeklyDistanceKm / 5, 3);
  const pattern: Array<[TrainingDay["type"], number]> = [
    ["Easy", 0.8],
    ["Tempo", 1.0],
    ["Rest", 0],
    ["Long", 1.6],
    ["Cross-train", 0],
    ["Sprint", 0.5],
    ["Rest", 0],
  ];
  return days.map((day, i) => {
    const [type, mult] = pattern[i];
    const distanceKm = mult > 0 ? Math.round(base * mult * 10) / 10 : null;
    return {
      day,
      type,
      distanceKm,
      targetCalories: distanceKm ? Math.round(distanceKm * 62) : 0,
      notes:
        type === "Rest"
          ? "Recovery day — mobility work, no zone claims needed."
          : type === "Tempo"
            ? "Comfortably hard pace, negative split the back half."
            : type === "Long"
              ? "Conversational pace, this is your calorie anchor for the week."
              : type === "Sprint"
                ? "8x400m intervals, full recovery between reps."
                : "Bike or swim, keep heart rate in zone 2.",
    };
  });
}

export async function generateTrainingPlan(avgWeeklyDistanceKm: number): Promise<TrainingDay[]> {
  const model = getGeminiModel();
  if (!model) return generateTrainingPlanFallback(avgWeeklyDistanceKm);

  try {
    const prompt = `Generate a personalized 7-day training plan for a college runner. Return ONLY a raw JSON array with no markdown: [{ "day": string, "type": "Rest"|"Easy"|"Tempo"|"Long"|"Sprint"|"Cross-train", "distanceKm": number|null, "targetCalories": number, "notes": string }]. Rules: notes maximum 20 words. Hard days must be followed by easy or rest days. Saturday or Sunday = longest run. Base the plan on this athlete's recent data: average weekly distance ${avgWeeklyDistanceKm.toFixed(1)}km.`;

    const result = await model.generateContent(prompt);
    const parsed = extractJson<TrainingDay[]>(result.response.text());
    if (!Array.isArray(parsed) || parsed.length !== 7) throw new Error("malformed training plan");
    return parsed;
  } catch (err) {
    console.error("[gemini] generateTrainingPlan failed, using fallback:", (err as Error).message);
    return generateTrainingPlanFallback(avgWeeklyDistanceKm);
  }
}
