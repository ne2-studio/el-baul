import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const API_BASE = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

// Create Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Get auth headers
export function getAuthHeaders(accessToken?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`
  };
}

// Get Supabase client auth token (for storage operations)
export function getSupabaseAuthToken(accessToken?: string) {
  return accessToken || SUPABASE_ANON_KEY;
}
