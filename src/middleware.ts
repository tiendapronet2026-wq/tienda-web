import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const legacyPrefixes = ["/productos", "/carrito", "/cotizacion", "/mi-cuenta", "/login", "/registro"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/admin/, "/panel") || "/panel";
    return NextResponse.redirect(url);
  }

  for (const prefix of legacyPrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = request.nextUrl.clone();
      if (prefix === "/productos" || prefix === "/carrito") {
        url.pathname = "/demos";
      } else if (prefix === "/cotizacion") {
        url.pathname = "/servicios";
      } else {
        url.pathname = "/panel";
      }
      return NextResponse.redirect(url);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
