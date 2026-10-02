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
  const { data, error } = await supabase.rpc("list_integration_connections_safe");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    provider: String(row.provider),
    connection_type: String(row.connection_type),
    display_name: String(row.display_name),
    external_account_id: row.external_account_id != null ? String(row.external_account_id) : null,
    external_account_label:
      row.external_account_label != null ? String(row.external_account_label) : null,
    status: String(row.status),
    is_active: Boolean(row.is_active),
    connected_at: row.connected_at != null ? String(row.connected_at) : null,
    last_verified_at: row.last_verified_at != null ? String(row.last_verified_at) : null,
    revoked_at: row.revoked_at != null ? String(row.revoked_at) : null,
  }));
}
