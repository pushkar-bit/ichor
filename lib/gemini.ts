import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

let client: GoogleGenerativeAI | null = null;

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: GEMINI_MODEL });
}

/** Strips markdown code fences and extracts the first JSON object/array from a Gemini response. */
export function extractJson<T>(text: string): T {
  const stripped = text.replace(/```json\s*|```\s*/g, "").trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    const match = stripped.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Could not parse JSON from Gemini response: " + text.slice(0, 200));
  }
}
