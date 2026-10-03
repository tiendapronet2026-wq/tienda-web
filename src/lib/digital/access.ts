import type { SupabaseClient } from "@supabase/supabase-js";

export type DigitalAccessResult =
  | { ok: true; label: string; accessUrl: string }
  | { ok: false; reason: "not_entitled" | "no_resource" | "inactive" };

/** Construye URL de acceso solo server-side; nunca exponer `external_resource_id` en APIs públicas de catálogo. */
export function buildGoogleDriveFolderAccessUrl(externalResourceId: string): string {
  const id = externalResourceId.trim();
  if (!id) return "";
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}

export async function resolveDigitalAccessForEntitlement(
  admin: SupabaseClient,
  entitlementId: string,
  userId: string,
): Promise<DigitalAccessResult> {
  const { data: ent } = await admin
    .from("digital_entitlements")
    .select("id, status, product_id, user_id")
    .eq("id", entitlementId)
    .maybeSingle<{
      id: string;
      status: string;
      product_id: string;
      user_id: string;
    }>();

  if (!ent || ent.user_id !== userId || ent.status !== "active") {
    return { ok: false, reason: "not_entitled" };
  }

  const { data: resource } = await admin
    .from("digital_delivery_resources")
    .select("label, external_resource_id, active, provider")
    .eq("product_id", ent.product_id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{
      label: string;
      external_resource_id: string;
      active: boolean;
      provider: string;
    }>();

  if (!resource || resource.provider !== "google_drive") {
    return { ok: false, reason: "no_resource" };
  }

  const accessUrl = buildGoogleDriveFolderAccessUrl(resource.external_resource_id);
  if (!accessUrl) {
    return { ok: false, reason: "inactive" };
  }

  return { ok: true, label: resource.label, accessUrl };
}
