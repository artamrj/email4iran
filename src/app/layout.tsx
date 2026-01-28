import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  HERO_IMAGE_ALT,
  HERO_IMAGE_URL,
  LANGUAGE_CODES,
  METADATA_BASE,
  OG_ALTERNATE_LOCALE,
  OG_LOCALE,
  ORGANIZATION_NAME,
  SITE_URL,
  SITE_URL_WITH_SLASH,
} from "@/constants/seo";

const favicon = new URL("./favicon.ico", import.meta.url);

const languageAlternates = LANGUAGE_CODES.reduce<Record<string, string>>(
  (acc, lang) => {
    acc[lang] = SITE_URL_WITH_SLASH;
    return acc;
  },
  {},
);

export const metadataBase = METADATA_BASE;
export const metadata: Metadata = {
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Email4Iran",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: ORGANIZATION_NAME, url: SITE_URL }],
  icons: {
    icon: favicon,
    shortcut: favicon,
    apple: favicon,
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL_WITH_SLASH,
    siteName: ORGANIZATION_NAME,
    type: "website",
    locale: OG_LOCALE,
    alternateLocale: OG_ALTERNATE_LOCALE,
    images: [
      {
        url: HERO_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: HERO_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [HERO_IMAGE_URL],
  },
  alternates: {
    canonical: SITE_URL_WITH_SLASH,
    languages: languageAlternates,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
