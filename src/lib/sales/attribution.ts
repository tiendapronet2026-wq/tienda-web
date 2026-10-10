import type { SupabaseClient } from "@supabase/supabase-js";
import { isSalesTrackingSrc, salesChannelFromTrackingSrc } from "@/lib/sales/channels";

export const SALES_ATTRIBUTION_COOKIE_CID = "tp_sales_cid";
export const SALES_ATTRIBUTION_COOKIE_SRC = "tp_sales_src";

/** Asocia visita a landing con conversación (cid opaco, sin ID de usuario en URL). */
export async function touchSalesAttribution(
  admin: SupabaseClient,
  params: { src: string | null; cid: string | null },
): Promise<void> {
  if (!isSalesTrackingSrc(params.src) || !params.cid?.trim()) return;

  const channel = salesChannelFromTrackingSrc(params.src);
  if (!channel) return;

  await admin
    .from("sales_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      state: "interested",
    })
    .eq("tracking_token", params.cid.trim())
    .eq("channel", channel);
}

/** @deprecated Usar touchSalesAttribution */
export async function touchMessengerAttribution(
  admin: SupabaseClient,
  params: { src: string | null; cid: string | null },
): Promise<void> {
  return touchSalesAttribution(admin, params);
}
