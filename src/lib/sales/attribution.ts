import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSENGER_TRACKING_SRC } from "@/lib/sales/tracking";

/** Asocia visita a landing con conversación Messenger (cid opaco, sin PSID en URL). */
export async function touchMessengerAttribution(
  admin: SupabaseClient,
  params: { src: string | null; cid: string | null },
): Promise<void> {
  if (params.src !== MESSENGER_TRACKING_SRC || !params.cid?.trim()) return;

  await admin
    .from("sales_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      state: "interested",
    })
    .eq("tracking_token", params.cid.trim())
    .eq("channel", "facebook_messenger");
}
