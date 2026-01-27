export const parseEmailList = (value: string): string[] => {
  const emails = value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const email of emails) {
    if (!seen.has(email)) {
      seen.add(email);
      unique.push(email);
    }
  }
  return unique;
};

export const selectPrimaryEmail = (
  emails: string[],
  preferred?: string | null,
): string => {
  if (emails.length === 0) return "";
  if (preferred && emails.includes(preferred)) return preferred;
  return emails[0];
};

export const buildCcEmails = (emails: string[], primary: string): string[] =>
  emails.filter((email) => email !== primary);

export const joinEmailList = (primary: string, ccEmails: string[] = []): string =>
  [primary, ...ccEmails].filter(Boolean).join(", ");
