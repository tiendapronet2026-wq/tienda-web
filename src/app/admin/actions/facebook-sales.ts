"use server";

import { adminCloseSalesConversation } from "@/app/admin/actions/sales-conversations";

export async function adminCloseFacebookConversation(conversationId: string) {
  return adminCloseSalesConversation(conversationId, "/admin/ventas-facebook");
}
