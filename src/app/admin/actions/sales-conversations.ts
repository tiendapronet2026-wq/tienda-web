"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { closeSalesConversation } from "@/lib/sales/conversation-repository";

export async function adminCloseSalesConversation(conversationId: string, listPath: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await closeSalesConversation(admin, conversationId);
  revalidatePath(listPath);
  return { ok: true };
}
