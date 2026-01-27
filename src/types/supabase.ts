export interface Topic {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  primaryRegion: string;
  tags: string[];
  defaultLanguage: string;
  lastUpdated: string; // timestamp
  metaPageTitle: string;
  metaPageDescription: string;
}

export interface Category {
  id: string;
  topicId: string;
  slug: string;
  name: string;
  description: string;
}

export interface Contact {
  id: string;
  categoryId: string;
  name: string;
  country: string;
  flag: string; // emoji or URL
  title: string;
  email: string;
  languages: string[];
}

export interface EmailTemplate {
  id: string;
  contactId: string;
  language: string; // "en" or "local"
  subject: string;
  body: string;
}