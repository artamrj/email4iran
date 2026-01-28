export type RewriteEmailRequest = {
  subject: string;
  body: string;
  language?: string;
};

export type RewriteEmailResponse = {
  subject: string;
  body: string;
  rewritten: boolean;
  reason?: string;
};

export const rewriteEmail = async (
  payload: RewriteEmailRequest,
): Promise<RewriteEmailResponse> => {
  const response = await fetch("/api/rewrite-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText || `Rewrite request failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as RewriteEmailResponse;
  const subject = (data.subject ?? "").trim();
  const body = (data.body ?? "").trim();

  if (!subject || !body) {
    return {
      subject: payload.subject,
      body: payload.body,
      rewritten: false,
      reason: data.reason ?? "invalid_response",
    };
  }

  return {
    subject,
    body,
    rewritten: data.rewritten === true,
    reason: data.reason,
  };
};
