import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  HERO_IMAGE_URL,
  LANGUAGE_HREFLANG,
  ORGANIZATION_NAME,
  SITE_URL,
} from "@/constants/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: ORGANIZATION_NAME,
  headline: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  inLanguage: Object.values(LANGUAGE_HREFLANG),
  publisher: {
    "@type": "Organization",
    name: ORGANIZATION_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: HERO_IMAGE_URL,
    },
  },
  image: HERO_IMAGE_URL,
};

export default function Head() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
