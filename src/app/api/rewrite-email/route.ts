import { NextResponse } from "next/server";


const DEFAULT_MODEL = "mistral-small-latest";
const DEFAULT_TIMEOUT_MS = 8000;
const MIN_TIMEOUT_MS = 2000;
const MAX_TIMEOUT_MS = 15000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 6000;

type RewriteRequest = {
  subject: string;
  body: string;
  language?: string;
  timeoutMs?: number;
};

type MistralChatCompletion = {
  choices?: {
    message?: { content?: string | string[] };
  }[];
};

const SYSTEM_PROMPT =
  "You rewrite emails without changing meaning. Output only JSON with subject and body.";

// ---------- helpers ----------

const jsonError = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...(extra ?? {}) }, { status });

const extractJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    const start = value.indexOf("{");
    const end = value.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(value.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const buildPrompt = (subject: string, body: string, languageHint?: string) => {
  const languageLine = languageHint
    ? `Language hint: ${languageHint}.`
    : "Language hint: auto-detect.";

  return [
    "Rewrite this email so it feels unique and natural and avoid any spam-like, while keeping the exact meaning and intent.",
    "Keep the same facts, names, numbers, dates, URLs, and email addresses.",
    "Do NOT add new claims, requests, or information.",
    "Preserve paragraph breaks and list formatting.",
    "Avoid spammy phrasing, excessive punctuation, and ALL CAPS.",
    "Keep the subject concise and similar length.",
    languageLine,
    "",
    "Return ONLY valid JSON in this format:",
    '{"subject":"...","body":"..."}',
    "",
    "Subject:",
    subject,
    "",
    "Body:",
    body,
  ].join("\n");
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });

const normalizeTimeoutMs = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, rounded));
};

// ---------- route ----------

export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return jsonError(503, "AI_NOT_CONFIGURED");

  let payload: RewriteRequest;
  try {
    payload = (await request.json()) as RewriteRequest;
  } catch {
    return jsonError(400, "INVALID_JSON");
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const language =
    typeof payload.language === "string" ? payload.language.trim() : undefined;

  if (!subject || !body) return jsonError(400, "MISSING_FIELDS");
  if (subject.length > MAX_SUBJECT_LENGTH || body.length > MAX_BODY_LENGTH) {
    return jsonError(400, "CONTENT_TOO_LONG");
  }

  const timeoutMs = normalizeTimeoutMs(payload.timeoutMs) ?? DEFAULT_TIMEOUT_MS;
  const model = process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;
  const prompt = buildPrompt(subject, body, language);

  try {
    const mistralRes = await withTimeout(
      fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: Math.min(
            1200,
            Math.max(200, Math.ceil(body.length / 3)),
          ),
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      }),
      timeoutMs,
    );

    if (!mistralRes.ok) {
      const text = await mistralRes.text();
      console.error("Mistral API error:", mistralRes.status, text);
      return jsonError(502, "AI_REQUEST_FAILED", { status: mistralRes.status });
    }

    const data = (await mistralRes.json()) as MistralChatCompletion;
    const rawContent = data.choices?.[0]?.message?.content ?? "";

    const contentText =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
        ? rawContent.join("")
        : "";

    if (!contentText) return jsonError(502, "INVALID_AI_RESPONSE");

    const parsed = extractJson(contentText);
    const rewrittenSubject =
      typeof parsed?.subject === "string" ? parsed.subject.trim() : "";
    const rewrittenBody =
      typeof parsed?.body === "string" ? parsed.body.trim() : "";

    if (!rewrittenSubject || !rewrittenBody) {
      return jsonError(502, "INVALID_AI_RESPONSE");
    }

    return NextResponse.json({
      subject: rewrittenSubject,
      body: rewrittenBody,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TIMEOUT") {
      return jsonError(504, "AI_TIMEOUT");
    }
    console.error("Rewrite email failed:", error);
    return jsonError(502, "AI_REQUEST_FAILED");
  }
}