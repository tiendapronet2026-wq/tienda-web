"use client";

import { useTransition } from "react";
import { adminCloseFacebookConversation } from "@/app/admin/actions/facebook-sales";
import { adminCloseWhatsAppConversation } from "@/app/admin/actions/whatsapp-sales";

type CloseConversationButtonProps = {
  conversationId: string;
  channel?: "facebook_messenger" | "whatsapp_business";
};

export function CloseConversationButton({
  conversationId,
  channel = "facebook_messenger",
}: CloseConversationButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
      onClick={() => {
        startTransition(async () => {
          if (channel === "whatsapp_business") {
            await adminCloseWhatsAppConversation(conversationId);
          } else {
            await adminCloseFacebookConversation(conversationId);
          }
        });
      }}
    >
      {pending ? "..." : "Cerrar"}
    </button>
  );
}
