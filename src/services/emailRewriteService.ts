export type RewriteEmailPayload = {
  subject: string;
  body: string;
  language?: string;
  timeoutMs?: number;
};

export type RewriteEmailResult = {
  subject: string;
  body: string;
};

const DEFAULT_TIMEOUT_MS = 4000;

export const rewriteEmail = async (
  payload: RewriteEmailPayload,
): Promise<RewriteEmailResult> => {
  const controller = new AbortController();
  const timeoutMs = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("/api/rewrite-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        subject: payload.subject,
        body: payload.body,
        language: payload.language,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`rewrite failed: ${response.status}`);
    }

    const data = (await response.json()) as Partial<RewriteEmailResult>;
    if (!data.subject || !data.body) {
      throw new Error("rewrite invalid response");
    }

    return {
      subject: data.subject,
      body: data.body,
    };
  } finally {
    clearTimeout(timeout);
  }
};
