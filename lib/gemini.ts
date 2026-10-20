import "server-only";

// Server-only Gemini client. The key never reaches the browser.
// Flash-Lite models answer in seconds; the larger Flash models took 40-90s+
// under free-tier load, which made every request time out.
// At most 2 attempts so they fit in the function time limit.
const MODELS = [process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]
  .filter((m, i, all): m is string => !!m && all.indexOf(m) === i)
  .slice(0, 2);
// GEMINI_API_BASE lets automated tests point at a local fake Gemini (saves free-tier quota).
// Never set it in production.
const ENDPOINT = `${process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com"}/v1beta/models`;
// Per-attempt timeouts: a quick first try on the fast model, then one fallback.
// Together they stay under the browser's 45s wait and Vercel Hobby's 60s limit.
const TIMEOUTS_MS = [15_000, 28_000];

export class AiError extends Error {
  constructor(public code: "rate_limited" | "ai_failed" | "not_configured", message?: string) {
    super(message ?? code);
  }
}

// Logs the real Gemini error on the server (terminal / Vercel logs), never in the browser
function logGeminiError(label: string, model: string, details: Record<string, unknown>) {
  console.error(`[gemini] ${label}`, JSON.stringify({ model, ...details }));
}

// Returns the response, or null if the request timed out
async function callGemini(
  model: string,
  body: string,
  key: string,
  label: string,
  timeoutMs: number
): Promise<Response | null> {
  const started = Date.now();
  try {
    return await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const e = err as Error;
    const timedOut = e.name === "TimeoutError" || e.name === "AbortError";
    logGeminiError(label, model, {
      error: timedOut ? `timeout after ${timeoutMs}ms` : `${e.name}: ${e.message}`,
      ms: Date.now() - started,
    });
    if (timedOut) return null;
    throw new AiError("ai_failed", e.message);
  }
}

export async function generateJson<T>(
  prompt: string,
  responseSchema: object,
  label = "generateJson",
  { thinking = "low" }: { thinking?: "minimal" | "low" } = {}
): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    logGeminiError(label, MODELS[0], { error: "GEMINI_API_KEY is not set" });
    throw new AiError("not_configured");
  }

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.4,
      // Rewriting text needs little reasoning; less thinking = faster answers
      thinkingConfig: { thinkingLevel: thinking },
    },
  });

  const started = Date.now();
  let res: Response | null = null;
  let model = MODELS[0];

  // Overloaded (503), quota hit (429, counted per model), model retired (404)
  // or too slow: try the next model
  for (const [i, m] of MODELS.entries()) {
    model = m;
    res = await callGemini(model, body, key, label, TIMEOUTS_MS[i] ?? TIMEOUTS_MS[TIMEOUTS_MS.length - 1]);
    if (res && ![404, 429, 503].includes(res.status)) break;
    if (res && model !== MODELS[MODELS.length - 1]) {
      logGeminiError(label, model, { status: res.status, note: "trying next model" });
    }
  }

  if (!res) throw new AiError("rate_limited", "All Gemini models timed out");

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let googleStatus: string | undefined;
    let googleMessage = raw.slice(0, 500);
    try {
      const parsed = JSON.parse(raw);
      googleStatus = parsed?.error?.status;
      googleMessage = parsed?.error?.message ?? googleMessage;
    } catch {}
    logGeminiError(label, model, {
      status: res.status,
      googleStatus,
      googleMessage,
      ms: Date.now() - started,
    });
    // 429 = free-tier quota hit, 503 = model overloaded: both mean "try again in a minute"
    if (res.status === 429 || res.status === 503) throw new AiError("rate_limited");
    throw new AiError("ai_failed", `Gemini ${res.status} ${googleStatus ?? ""}: ${googleMessage}`);
  }

  console.log(`[gemini] ${label}`, JSON.stringify({ model, status: res.status, ms: Date.now() - started }));
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  // Skip "thought" parts; only the answer text is JSON
  const text: string =
    candidate?.content?.parts
      ?.filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text?: string }) => p.text ?? "")
      .join("") ?? "";

  try {
    return JSON.parse(text) as T;
  } catch {
    logGeminiError(label, model, {
      error: "invalid JSON in response",
      finishReason: candidate?.finishReason,
      blockReason: data?.promptFeedback?.blockReason,
      preview: text.slice(0, 200),
      ms: Date.now() - started,
    });
    throw new AiError("ai_failed", "Gemini returned invalid JSON");
  }
}
