export function getWhatsAppPhoneNumberId(): string | null {
  return process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
}

export function getWhatsAppAccessToken(): string | null {
  return (
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    process.env.META_WHATSAPP_ACCESS_TOKEN?.trim() ||
    null
  );
}

export function getWhatsAppWebhookVerifyToken(): string | null {
  return (
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
    process.env.META_WHATSAPP_VERIFY_TOKEN?.trim() ||
    process.env.META_VERIFY_TOKEN?.trim() ||
    null
  );
}
