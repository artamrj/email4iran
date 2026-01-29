export interface Topic {
  id: string;
  slug: string;
  name: string; // Changed from title
  description: string; // Changed from shortDescription and longDescription
  emoji?: string; // Added new field
  is_active?: boolean; // Control visibility in the app
  featured_order?: number | null; // 1 or 2 for homepage spotlight
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
  email: string; // Primary email (To)
  cc_emails?: string[]; // Additional emails (CC)
  languages: string[];
}

export interface EmailTemplate {
  id: string;
  contact_id: string; // Changed from contactId
  language: string;
  subject: string;
  body: string;
}
