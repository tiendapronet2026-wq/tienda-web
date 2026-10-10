import type { SupabaseClient } from "@supabase/supabase-js";
import { salesChannelFromTrackingSrc } from "@/lib/sales/channels";

export const SALES_ATTRIBUTION_MARKER = "[SALES_ATTRIBUTION]";

/** Formato: `[SALES_ATTRIBUTION] whatsapp_business:<tracking_token>` */
export function formatSalesAttributionNotes(src: string, cid: string): string {
  const token = cid.trim();
  if (!token) return "";
  return `${SALES_ATTRIBUTION_MARKER} ${src.trim()}:${token}`;
}

export function parseSalesAttributionFromNotes(
  notes: string | null | undefined,
): { src: string; cid: string } | null {
  if (!notes?.includes(SALES_ATTRIBUTION_MARKER)) return null;
  const match = notes.match(
    /\[SALES_ATTRIBUTION\]\s+(facebook_messenger|whatsapp_business):([a-f0-9]+)/i,
  );
  if (!match) return null;
  return { src: match[1], cid: match[2] };
}

export function mergeSalesAttributionIntoNotes(
  notes: string | null | undefined,
  src: string,
  cid: string,
): string {
  const fragment = formatSalesAttributionNotes(src, cid);
  if (!fragment) return notes?.trim() ?? "";
  if (notes?.includes(SALES_ATTRIBUTION_MARKER)) return notes.trim();
  return `${notes?.trim() ?? ""} ${fragment}`.trim();
}

/** Marca conversación como comprada tras pago acreditado + entitlement. */
export async function syncSalesConversationPurchase(
  admin: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data: order } = await admin
    .from("orders")
    .select("notes")
    .eq("id", orderId)
    .maybeSingle<{ notes: string | null }>();

  const attribution = parseSalesAttributionFromNotes(order?.notes);
  if (!attribution) return;

  const channel = salesChannelFromTrackingSrc(attribution.src);
  if (!channel) return;

  await admin
    .from("sales_conversations")
    .update({
      state: "purchased",
      handoff_requested: false,
      last_message_at: new Date().toISOString(),
    })
    .eq("tracking_token", attribution.cid)
    .eq("channel", channel);
}
