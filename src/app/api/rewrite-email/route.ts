import { NextResponse } from "next/server";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";
const DEFAULT_TIMEOUT_MS = 3500;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 6000;

type RewriteRequest = {
  subject: string;
  body: string;
  language?: string;
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
  const language = typeof payload.language === "string" ? payload.language.trim() : undefined;

  if (!subject || !body) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT_LENGTH || body.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "CONTENT_TOO_LONG" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const model = process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: Math.min(1200, Math.max(200, Math.ceil(body.length / 3))),
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You rewrite emails without changing meaning. Output only JSON with subject and body.",
          },
          {
            role: "user",
            content: buildPrompt(subject, body, language),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mistral rewrite error:", response.status, errorText);
      return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const contentText = Array.isArray(content) ? content.join("") : content;

    if (typeof contentText !== "string") {
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
    if ((error as Error).name === "AbortError") {
      return NextResponse.json({ error: "AI_TIMEOUT" }, { status: 504 });
    }
    console.error("Rewrite email failed:", error);
    return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
