import { cookies } from "next/headers";

export const SESSION_COOKIE = "tienda_session";
export const MAX_CART_QUANTITY = 99;

export async function getOrCreateSessionId() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId || !isValidSessionId(sessionId)) {
    sessionId = crypto.randomUUID();
    cookieStore.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return sessionId;
}

export function isValidSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      console.warn("NEXT_PUBLIC_SITE_URL no está configurada en producción.");
    }
    return "http://localhost:3000";
  }
  return url.replace(/\/$/, "");
}
