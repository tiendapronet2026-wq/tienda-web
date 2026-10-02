import { createClient } from "@/lib/supabase/server";

export type SafeConnectionRow = {
  id: string;
  provider: string;
  connection_type: string;
  display_name: string;
  external_account_id: string | null;
  external_account_label: string | null;
  status: string;
  is_active: boolean;
  connected_at: string | null;
  last_verified_at: string | null;
  revoked_at: string | null;
};

export async function listSafeConnections(): Promise<SafeConnectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("integration_connections")
    .select(
      "id, provider, connection_type, display_name, external_account_id, external_account_label, status, is_active, connected_at, last_verified_at, revoked_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SafeConnectionRow[];
}
