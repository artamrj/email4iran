import { NextResponse } from "next/server";

const DEFAULT_API_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";
const REQUEST_TIMEOUT_MS = 4000;

type RewriteRequest = {
  subject: string;
  body: string;
  language?: string;
};

type RewriteResponse = {
  subject: string;
  body: string;
  rewritten: boolean;
  reason?: string;
};

const buildSystemPrompt = () =>
  [
    "You rewrite emails to make them unique and less likely to be flagged as spam.",
    "Preserve the exact meaning, intent, and call-to-action.",
    "Keep names, dates, numbers, URLs, and email addresses unchanged.",
    "If placeholders like {{name}} appear, keep them exactly as-is.",
    "Do not add new facts or remove any facts.",
    "Keep the same language as the input and similar length and formatting.",
    "Avoid spammy wording, excessive punctuation, ALL CAPS, or exaggerated claims.",
    "Return ONLY a JSON object with keys: subject, body.",
  ].join(" ");

const buildUserPrompt = (subject: string, body: string, language?: string) =>
  [
    "Rewrite the email below.",
    `Language: ${language ?? "auto-detect"}.`,
    "Subject:",
    subject,
    "Body:",
    body,
  ].join("\n");

const extractJson = (text: string) => {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
};

const parseRewriteContent = (content: string) => {
  const rawJson = extractJson(content) ?? content;
  try {
    return JSON.parse(rawJson) as { subject?: string; body?: string };
  } catch {
    return null;
  }
};

const buildFallback = (
  payload: RewriteRequest,
  reason: string,
): RewriteResponse => ({
  subject: payload.subject,
  body: payload.body,
  rewritten: false,
  reason,
});

export async function POST(request: Request) {
  let payload: RewriteRequest;
  try {
    payload = (await request.json()) as RewriteRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const subject = payload.subject?.trim();
  const body = payload.body?.trim();

  if (!subject || !body) {
    return NextResponse.json(
      { error: "Subject and body are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildFallback(payload, "missing_api_key"));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      process.env.MISTRAL_API_URL || DEFAULT_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.MISTRAL_MODEL || DEFAULT_MODEL,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: buildUserPrompt(subject, body, payload.language) },
          ],
          temperature: 0.3,
          max_tokens: 700,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        buildFallback(payload, `mistral_error_${response.status}`),
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(buildFallback(payload, "empty_response"));
    }

    const parsed = parseRewriteContent(content);
    const rewrittenSubject = parsed?.subject?.trim();
    const rewrittenBody = parsed?.body?.trim();

    if (!rewrittenSubject || !rewrittenBody) {
      return NextResponse.json(buildFallback(payload, "invalid_response"));
    }

    return NextResponse.json({
      subject: rewrittenSubject,
      body: rewrittenBody,
      rewritten: true,
    });
  } catch (error) {
    const reason =
      error instanceof DOMException && error.name === "AbortError"
        ? "timeout"
        : "request_failed";
    return NextResponse.json(buildFallback(payload, reason));
  } finally {
    clearTimeout(timeout);
  }
}
