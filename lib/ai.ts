/**
 * Simulated Gemini integration. Mirrors the exact JSON contracts specified in the
 * ICHOR PRD (services/geminiService.ts) so a real @google/generative-ai call can be
 * swapped in later without touching any caller.
 */

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

export function classifyDiet(description: string): {
  classification: "CLEAN" | "CHEAT" | "NEUTRAL";
  estimatedCalories: number;
  integrityBonus: number;
  suggestion: string;
} {
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

export function parseScreenshot(filename: string): {
  activityType: "RUN" | "WALK" | "CYCLE";
  distanceKm: number;
  durationSeconds: number;
  avgPaceMinPerKm: number | null;
  caloriesBurned: number;
  heartRateAvg: number | null;
  workoutDate: string;
} {
  // Deterministic pseudo-OCR: real integration point is @google/generative-ai vision.
  const seed = Array.from(filename).reduce((a, c) => a + c.charCodeAt(0), 0);
  const distanceKm = Math.round((3 + (seed % 12)) * 10) / 10;
  const durationSeconds = Math.round(distanceKm * (5 + (seed % 3)) * 60);
  const avgPaceMinPerKm = Math.round((durationSeconds / 60 / distanceKm) * 100) / 100;
  const caloriesBurned = Math.round(distanceKm * 62 + (seed % 40));
  return {
    activityType: "RUN",
    distanceKm,
    durationSeconds,
    avgPaceMinPerKm,
    caloriesBurned,
    heartRateAvg: 140 + (seed % 30),
    workoutDate: new Date().toISOString().slice(0, 10),
  };
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

export function coachReply(message: string, ctx: CoachContext): string {
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

export type TrainingDay = {
  day: string;
  type: "Rest" | "Easy" | "Tempo" | "Long" | "Sprint" | "Cross-train";
  distanceKm: number | null;
  targetCalories: number;
  notes: string;
};

export function generateTrainingPlan(avgWeeklyDistanceKm: number): TrainingDay[] {
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
