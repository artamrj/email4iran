-- Create the topics table
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "longDescription" TEXT NOT NULL,
  "primaryRegion" TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
  "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "metaPageTitle" TEXT NOT NULL,
  "metaPageDescription" TEXT NOT NULL
);

-- Create the categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "topicId" UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  UNIQUE ("topicId", slug)
);

-- Create the contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  flag TEXT NOT NULL,
  title TEXT NOT NULL,
  email TEXT NOT NULL,
  languages TEXT[] NOT NULL DEFAULT '{}'
);

-- Create the email_templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contactId" UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  UNIQUE ("contactId", language)
);