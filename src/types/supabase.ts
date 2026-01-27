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
  country?: string; // Made optional
  flag?: string; // Made optional (emoji or URL)
  title?: string; // Made optional
  email: string;
  languages: string[];
  contactType: 'government' | 'organization' | 'individual' | 'institution' | 'other'; // New field
  website?: string; // New optional field
}

export interface EmailTemplate {
  id: string;
  contactId: string;
  language: string; // "en" or "local"
  subject: string;
  body: string;
}