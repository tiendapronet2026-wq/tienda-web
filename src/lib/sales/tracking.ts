export const MESSENGER_TRACKING_SRC = "facebook_messenger";
export const WHATSAPP_TRACKING_SRC = "whatsapp_business";

export function buildTrackedOfferUrl(
  baseOfferUrl: string,
  src: string,
  trackingToken?: string,
): string {
  const url = new URL(baseOfferUrl);
  url.searchParams.set("src", src);
  if (trackingToken) {
    url.searchParams.set("cid", trackingToken);
  }
  return url.toString();
}

export function buildMessengerOfferUrl(baseOfferUrl: string, trackingToken?: string): string {
  return buildTrackedOfferUrl(baseOfferUrl, MESSENGER_TRACKING_SRC, trackingToken);
}

export function buildWhatsAppOfferUrl(baseOfferUrl: string, trackingToken?: string): string {
  return buildTrackedOfferUrl(baseOfferUrl, WHATSAPP_TRACKING_SRC, trackingToken);
}
