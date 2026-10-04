"use client";

import { useTransition } from "react";
import { adminCloseFacebookConversation } from "@/app/admin/actions/facebook-sales";

export function CloseConversationButton({ conversationId }: { conversationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
      onClick={() => {
        startTransition(async () => {
          await adminCloseFacebookConversation(conversationId);
        });
      }}
    >
      {pending ? "..." : "Cerrar"}
    </button>
  );
}
