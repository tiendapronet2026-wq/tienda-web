"use server";

import { adminCloseSalesConversation } from "@/app/admin/actions/sales-conversations";

export async function adminCloseWhatsAppConversation(conversationId: string) {
  return adminCloseSalesConversation(conversationId, "/admin/ventas-whatsapp");
}
