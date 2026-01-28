import { NextResponse } from "next/server";
import { getTopics } from "@/services/supabaseService";
import {
  LANGUAGE_HREFLANG,
  SITE_URL,
  SITE_URL_WITH_SLASH,
} from "@/constants/seo";

const buildAbsoluteUrl = (path: string) => {
  if (!path) return SITE_URL_WITH_SLASH;
  if (path.startsWith("/")) {
    return `${SITE_URL}${path}`;
  }
  return `${SITE_URL}/${path}`;
};

const buildHreflangs = (url: string) =>
  Object.values(LANGUAGE_HREFLANG)
    .map(
      (hreflang) =>
        `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${url}"/>`,
    )
    .join("");

export async function GET() {
  const topics = await getTopics().catch(() => []);
  const activePaths = topics
    .filter((topic) => topic.is_active !== false)
    .map((topic) => `/${topic.slug}`);

  const routes = ["/", ...activePaths];

  const urlsXml = routes
    .map((route) => {
      const absoluteUrl = buildAbsoluteUrl(route);
      const hreflangs = buildHreflangs(absoluteUrl);
      return `
        <url>
          <loc>${absoluteUrl}</loc>
          ${hreflangs}
          <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl}"/>
        </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${urlsXml}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
