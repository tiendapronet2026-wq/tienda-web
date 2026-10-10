export type SalesChannel = "facebook_messenger" | "whatsapp_business";

export const SALES_CHANNEL_TRACKING_SRC: Record<SalesChannel, string> = {
  facebook_messenger: "facebook_messenger",
  whatsapp_business: "whatsapp_business",
};

export function isSalesTrackingSrc(src: string | null | undefined): src is string {
  if (!src) return false;
  return src === "facebook_messenger" || src === "whatsapp_business";
}

export function salesChannelFromTrackingSrc(src: string): SalesChannel | null {
  if (src === "facebook_messenger") return "facebook_messenger";
  if (src === "whatsapp_business") return "whatsapp_business";
  return null;
}
