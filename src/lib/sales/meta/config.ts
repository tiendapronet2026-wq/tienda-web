export function getMetaAppSecret(): string | null {
  return process.env.META_APP_SECRET?.trim() || null;
}

export function getMetaMessengerVerifyToken(): string | null {
  return (
    process.env.META_MESSENGER_VERIFY_TOKEN?.trim() ||
    process.env.META_VERIFY_TOKEN?.trim() ||
    null
  );
}

export function getMetaPageAccessToken(): string | null {
  return process.env.META_PAGE_ACCESS_TOKEN?.trim() || null;
}

export function getMetaPageId(): string | null {
  return process.env.META_PAGE_ID?.trim() || null;
}

export const META_GRAPH_API_VERSION = "v21.0";
