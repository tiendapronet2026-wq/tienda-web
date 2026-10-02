import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/** Cliente anon para RPC de /connect (hash one-time; sin service_role). */
export function createIntegrationConnectClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
