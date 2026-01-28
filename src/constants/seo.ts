const rawSiteURL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://irani.email";
const normalizedSiteURL = rawSiteURL.replace(/\/+$/, "");

export const SITE_URL = normalizedSiteURL;
export const SITE_URL_WITH_SLASH = `${normalizedSiteURL}/`;
export const METADATA_BASE = new URL(SITE_URL_WITH_SLASH);
export const SITEMAP_URL = `${normalizedSiteURL}/sitemap.xml`;

export const ORGANIZATION_NAME = "Email4Iran";
export const DEFAULT_TITLE = `${ORGANIZATION_NAME} | Free Iran advocacy emails in Persian & English`;
export const DEFAULT_DESCRIPTION =
  "Email4Iran gives activists verified contacts, bilingual templates, and ready-to-send advocacy mail so every message reaches the right inbox in Persian and English.";

export const DEFAULT_KEYWORDS = [
  "Email4Iran",
  "irani email",
  "Iran advocacy",
  "bilingual activism",
  "human rights in Iran",
  "Free Iran",
  "IranRevolution2026",
  "advocacy templates",
  "public diplomacy",
  "Persian email templates",
];

export const HERO_IMAGE_ALT = "Lion and Sun emblem set against gradients for Email4Iran";
export const HERO_IMAGE_URL = `${SITE_URL}/lionandsun.png`;

export const OG_LOCALE = "en_US";
export const OG_ALTERNATE_LOCALE = "fa_IR";

export const LANGUAGE_HREFLANG = {
  en: "en-US",
  fa: "fa-IR",
} as const;
export const LANGUAGE_CODES = Object.keys(LANGUAGE_HREFLANG) as Array<keyof typeof LANGUAGE_HREFLANG>;
