"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { closeSalesConversation } from "@/lib/sales/conversation-repository";

export async function adminCloseFacebookConversation(conversationId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await closeSalesConversation(admin, conversationId);
  revalidatePath("/admin/ventas-facebook");
  return { ok: true };
}
