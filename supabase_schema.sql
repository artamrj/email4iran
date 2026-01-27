-- enable uuid generation if not already enabled (Postgres)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TOPICS (high-level campaigns)
CREATE TABLE topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  default_language TEXT NOT NULL DEFAULT 'en'
);

-- GROUPS (generic grouping inside a topic: countries, companies, universities, etc.)
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  UNIQUE (topic_id, name)
);

-- CONTACTS (entities you email: person, department, company, university, etc.)
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,          -- person or entity name
  organization TEXT,                  -- optional: company, university, institution
  location    TEXT,                   -- city/country/region, very general
  emoji       TEXT,                   -- e.g. flag or logo emoji
  email       TEXT NOT NULL,
  languages   TEXT[] NOT NULL DEFAULT '{}'
);

-- EMAIL TEMPLATES (per contact and language)
CREATE TABLE email_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  language   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  UNIQUE (contact_id, language)
);