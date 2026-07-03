import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the user signed in across reloads and refresh tokens automatically.
    persistSession: true,
    autoRefreshToken: true,
    // Parse the session out of the magic-link redirect URL on load.
    detectSessionInUrl: true,
  },
});