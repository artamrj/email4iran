import { NextResponse } from "next/server";

export const runtime = "edge"; // faster cold starts on Vercel etc.

const DEFAULT_MODEL = "mistral-small-latest";
const DEFAULT_TIMEOUT_MS = 8000;
const MIN_TIMEOUT_MS = 2000;
const MAX_TIMEOUT_MS = 15000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 6000;
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

type RewriteRequest = {
  subject: string;
  body: string;
  language?: string;
  timeoutMs?: number;
};

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
    "Rewrite this email so it feels unique and natural, while keeping the exact meaning and intent.",
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

const SYSTEM_MESSAGE =
  "You rewrite emails without changing meaning. Output only JSON with subject and body.";

const buildMessages = (
  subject: string,
  body: string,
  languageHint?: string,
) => [
  {
    role: "system",
    content: SYSTEM_MESSAGE,
  },
  {
    role: "user",
    content: buildPrompt(subject, body, languageHint),
  },
];

const callMistralChatCompletion = async (params: {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  messages: { role: string; content: string }[];
  signal?: AbortSignal;
}) => {
  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      response_format: { type: "json_object" },
      messages: params.messages,
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Mistral API error: ${response.status}${message ? ` ${message}` : ""}`,
    );
  }

  return response.json();
};

// generic timeout helper for SDK calls
const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  onTimeout?: () => void,
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      onTimeout?.();
      reject(new Error("TIMEOUT"));
    }, ms);
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
};

export async function POST(request: Request) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let payload: RewriteRequest;
  try {
    payload = (await request.json()) as RewriteRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const language =
    typeof payload.language === "string" ? payload.language.trim() : undefined;

  const normalizeTimeoutMs = (value?: number) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return undefined;
    }
    const rounded = Math.round(value);
    return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, rounded));
  };

  const requestedTimeoutMs = normalizeTimeoutMs(payload.timeoutMs);
  const timeoutMs = requestedTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!subject || !body) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT_LENGTH || body.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "CONTENT_TOO_LONG" }, { status: 400 });
  }

  const model = process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;

  try {
    const controller = new AbortController();
    const maxTokens = Math.min(1200, Math.max(200, Math.ceil(body.length / 3)));
    const completion = await withTimeout(
      callMistralChatCompletion({
        apiKey,
        model,
        temperature: 0.4,
        maxTokens,
        messages: buildMessages(subject, body, language),
        signal: controller.signal,
      }),
      timeoutMs,
      () => controller.abort(),
    );

    const content = completion.choices?.[0]?.message?.content;

    const contentText =
      typeof content === "string"
        ? content
        : Array.isArray(content)
        ? content.join("")
        : "";

    if (typeof contentText !== "string" || !contentText) {
      return NextResponse.json({ error: "INVALID_AI_RESPONSE" }, { status: 502 });
    }

    const parsed = extractJson(contentText);
    const rewrittenSubject =
      typeof parsed?.subject === "string" ? parsed.subject.trim() : "";
    const rewrittenBody =
      typeof parsed?.body === "string" ? parsed.body.trim() : "";

    if (!rewrittenSubject || !rewrittenBody) {
      return NextResponse.json({ error: "INVALID_AI_RESPONSE" }, { status: 502 });
    }

    return NextResponse.json({
      subject: rewrittenSubject,
      body: rewrittenBody,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TIMEOUT") {
      return NextResponse.json({ error: "AI_TIMEOUT" }, { status: 504 });
    }
    console.error("Rewrite email failed:", error);
    return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
  }
}
