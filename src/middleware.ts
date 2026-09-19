import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const legacyPrefixes = ["/productos", "/carrito", "/cotizacion", "/mi-cuenta", "/login", "/registro"];

const panelRedirects: Record<string, string> = {
  "/panel/modulos": "/app/modulos",
  "/panel/clientes": "/app/clientes",
  "/panel/informes": "/app/informes",
  "/panel/agentes": "/app/asistente",
  "/panel/configuracion": "/app/configuracion",
  "/panel/proyectos": "/control/proyectos",
  "/panel/tareas": "/control/tareas",
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/admin/, "/control") || "/control";
    return NextResponse.redirect(url);
  }

  if (pathname === "/panel" || pathname === "/panel/") {
    return NextResponse.redirect(new URL("/control", request.url));
  }

  for (const [from, to] of Object.entries(panelRedirects)) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      return NextResponse.redirect(new URL(to, request.url));
    }
  }

  for (const prefix of legacyPrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = request.nextUrl.clone();
      if (prefix === "/productos" || prefix === "/carrito") {
        url.pathname = "/demos";
      } else if (prefix === "/cotizacion") {
        url.pathname = "/servicios";
      } else {
        url.pathname = "/control";
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
