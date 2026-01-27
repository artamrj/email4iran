import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required. Please set it in your Cloudflare environment variables.");
}

if (!supabaseAnonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is required. Please set it in your Cloudflare environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);