import type { SafeConnectionRow } from "@/lib/integrations/integration-service";

/** M&M read-only: estado de integraciones sin secretos ni acciones. */
export type MmIntegrationStatusView = {
  provider: string;
  displayName: string;
  status: string;
  isActive: boolean;
  externalAccountLabel: string | null;
  connectedAt: string | null;
  lastVerifiedAt: string | null;
};

export function toMmIntegrationStatusViews(rows: SafeConnectionRow[]): MmIntegrationStatusView[] {
  return rows.map((r) => ({
    provider: r.provider,
    displayName: r.display_name,
    status: r.status,
    isActive: r.is_active,
    externalAccountLabel: r.external_account_label,
    connectedAt: r.connected_at,
    lastVerifiedAt: r.last_verified_at,
  }));
}
