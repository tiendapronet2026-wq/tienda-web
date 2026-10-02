import { createClient } from "@supabase/supabase-js";

/** Cliente anon para RPC de /connect (hash one-time; sin service_role). */
export function createIntegrationConnectClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase público no configurado.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
