"use server";

import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDigitalAccessForEntitlement } from "@/lib/digital/access";

export async function openDigitalEntitlementAccess(entitlementId: string) {
  const user = await requireAuth("/login?redirect=/mis-compras");
  const admin = createAdminClient();
  const result = await resolveDigitalAccessForEntitlement(admin, entitlementId, user.id);

  if (!result.ok) {
    return { error: "No tenés acceso a este contenido o aún no está disponible." };
  }

  return { accessUrl: result.accessUrl, label: result.label };
}
