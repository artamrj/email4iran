import { createClient } from '@supabase/supabase-js';

// These values are hardcoded as per your request to remove the .env file.
// If you need dynamic environment variables for different deployments (e.g., staging vs. production),
// set them as build-time environment variables in your hosting platform and access them via
// `process.env.NEXT_PUBLIC_SUPABASE_URL` / `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
const SUPABASE_URL = "https://kglpspeapmjdgodywpfq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnbHBzcGVhcG1qZGdvZHl3cGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzI1NjEsImV4cCI6MjA4NTA0ODU2MX0.nZKuLgogH-SmsYXF9k-MXtQFeuAmxkKl0hiUQ4CVtmE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
