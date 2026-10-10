import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;
let authReady: Promise<void> | null = null;

/**
 * Lazily created so builds/prerender don't crash when credentials are absent.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/**
 * Resolves once the client has finished its initial session load, including
 * exchanging the OAuth `?code=` in the URL after a redirect. Callers must await
 * this before deciding a request is unauthenticated, otherwise pages that fire
 * requests on mount will 401 right after login.
 */
export function getAuthReady(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return Promise.resolve();
  if (!authReady) {
    authReady = supabase.auth.getSession().then(() => undefined);
  }
  return authReady;
}
