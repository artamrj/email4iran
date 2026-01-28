import {
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_TITLE,
  HERO_IMAGE_ALT,
  HERO_IMAGE_URL,
  LANGUAGE_HREFLANG,
  OG_ALTERNATE_LOCALE,
  OG_LOCALE,
  ORGANIZATION_NAME,
  SITE_URL,
} from "@/constants/seo";
import { getTopicBySlug } from "@/services/supabaseService";
import { Topic } from "@/types/supabase";

const makeDescription = (text: string) => {
  const flattened = text.replace(/\s+/g, " ").trim();
  if (flattened.length <= 160) return flattened;
  return `${flattened.slice(0, 157).trim()}...`;
};

const buildKeywords = (topic?: Topic | null) => {
  if (!topic) {
    return DEFAULT_KEYWORDS;
  }
  const terms = new Set<string>([topic.name, "Iran advocacy", "bilingual email"]);
  topic.description
    .split(/[\s,.#-]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2)
    .slice(0, 8)
    .forEach((term) => terms.add(term));
  DEFAULT_KEYWORDS.slice(0, 12).forEach((term) => terms.add(term));
  return Array.from(terms).slice(0, 20);
};

const getCanonicalUrl = (slug?: string) => {
  if (!slug) return SITE_URL;
  return `${SITE_URL}/${slug}`;
};

type HeadProps = {
  params: {
    topicSlug?: string | string[];
  };
};

export default async function Head({ params }: HeadProps) {
  const slugParam = Array.isArray(params.topicSlug)
    ? params.topicSlug[0]
    : params.topicSlug;
  let topic: Topic | null = null;
  try {
    if (slugParam) {
      topic = await getTopicBySlug(slugParam);
      if (topic?.is_active === false) {
        topic = null;
      }
    }
  } catch (error) {
    console.error("Failed to load topic metadata", error);
  }

  const metaTitle = topic
    ? `${topic.name} | ${ORGANIZATION_NAME}`
    : DEFAULT_TITLE;
  const metaDescription = topic
    ? makeDescription(topic.description || DEFAULT_DESCRIPTION)
    : DEFAULT_DESCRIPTION;
  const canonicalUrl = topic ? getCanonicalUrl(topic.slug) : SITE_URL;
  const keywords = buildKeywords(topic).join(", ");

  return (
    <>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={ORGANIZATION_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={OG_LOCALE} />
      <meta property="og:locale:alternate" content={OG_ALTERNATE_LOCALE} />
      <meta property="og:image" content={HERO_IMAGE_URL} />
      <meta property="og:image:alt" content={HERO_IMAGE_ALT} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={HERO_IMAGE_URL} />
      <meta name="twitter:image:alt" content={HERO_IMAGE_ALT} />
      {Object.entries(LANGUAGE_HREFLANG).map(([lang, hreflang]) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={hreflang}
          href={canonicalUrl}
        />
      ))}
      <meta name="robots" content="index, follow" />
    </>
  );
}
