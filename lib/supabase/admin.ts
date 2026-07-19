import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Privileged client using the service role key — bypasses RLS entirely.
// Import only from server-side code (route handlers, server actions).
// The `server-only` import makes any accidental client-bundle import a build error.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
