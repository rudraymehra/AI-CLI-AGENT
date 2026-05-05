import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "./prompt";

let _client: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set in .env.local");
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// flash-lite was skipping TOOL calls and going straight to OUTPUT — flash-latest follows the schema better
const PRIMARY_MODEL = "gemini-flash-latest";
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
];

export const GEMINI_MODEL = PRIMARY_MODEL;
export const MODEL_CHAIN = [
  PRIMARY_MODEL,
  ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL),
];

export function getModel(name: string = PRIMARY_MODEL): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: name,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  });
}

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|500|502|503|504)\b/.test(msg) ||
    /Service Unavailable|high demand|overloaded|UNAVAILABLE|deadline/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send a message with retry+fallback. Tries the primary model with exponential
 * backoff on transient errors (429/5xx), then falls through to fallback models
 * starting a fresh chat with the same prior history each time.
 */
export async function sendWithRetry(
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  input: string,
): Promise<{ text: string; modelUsed: string }> {
  let lastErr: unknown;
  for (const modelName of MODEL_CHAIN) {
    const model = getModel(modelName);
    const chat = model.startChat({ history });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await chat.sendMessage(input);
        return { text: res.response.text(), modelUsed: modelName };
      } catch (e: unknown) {
        lastErr = e;
        if (!isRetryable(e)) throw e;
        await sleep(500 * 2 ** attempt + Math.random() * 200);
      }
    }
  }
  throw lastErr ?? new Error("All Gemini models failed");
}

export function safeParseStep(raw: string) {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return JSON.parse(s);
}
