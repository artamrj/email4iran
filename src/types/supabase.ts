export interface Topic {
  id: string;
  slug: string;
  name: string; // Changed from title
  description: string; // Changed from shortDescription and longDescription
  default_language: string; // Changed from defaultLanguage
}

export interface Group { // Renamed from Category
  id: string;
  topic_id: string; // Changed from topicId
  name: string;
  description: string;
}

export interface Contact {
  id: string;
  group_id: string; // Changed from categoryId
  name: string;
  organization: string | null; // New field
  location: string | null; // New field
  emoji: string; // Changed from flag
  email: string;
  languages: string[];
}

export interface EmailTemplate {
  id: string;
  contact_id: string; // Changed from contactId
  language: string;
  subject: string;
  body: string;
}