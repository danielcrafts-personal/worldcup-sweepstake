import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** True when Supabase env is configured. When false, the app uses the local
 *  JSON-file dev fallback (see lib/db.ts) so it runs without provisioning. */
export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the service-role key (bypasses RLS).
 *  Never import this into client components. */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}
