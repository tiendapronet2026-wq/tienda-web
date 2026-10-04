export const MESSENGER_TRACKING_SRC = "facebook_messenger";

export function buildMessengerOfferUrl(baseOfferUrl: string, trackingToken?: string): string {
  const url = new URL(baseOfferUrl);
  url.searchParams.set("src", MESSENGER_TRACKING_SRC);
  if (trackingToken) {
    url.searchParams.set("cid", trackingToken);
  }
  return url.toString();
}
