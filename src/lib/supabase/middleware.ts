import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isAppPanelPath,
  isControlPanelPath,
  isPrivatePanelPath,
  resolvePostLoginRedirect,
} from "@/lib/platform/panel-access";
import { loadSessionPlatformContext } from "@/lib/platform/session-platform";
import { isTiendaProSupabaseConfigured } from "@/lib/platform/tenant-loader";

const AUTH_PUBLIC_PATHS = ["/login", "/registro", "/recuperar-password", "/actualizar-password"];
const AUTH_FLOW_PATHS = ["/auth/callback", ...AUTH_PUBLIC_PATHS];

function isAuthFlowPath(pathname: string): boolean {
  return AUTH_FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const platformDb = isTiendaProSupabaseConfigured();

  if (!url || !key) {
    if (isPrivatePanelPath(pathname)) {
      const denied = request.nextUrl.clone();
      denied.pathname = "/acceso-denegado";
      return NextResponse.redirect(denied);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPrivatePanelPath(pathname) && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  if (user && platformDb && isPrivatePanelPath(pathname)) {
    try {
      const ctx = await loadSessionPlatformContext(supabase, user.id);
      const controlPath = isControlPanelPath(pathname);
      const appPath = isAppPanelPath(pathname);
      const allowed =
        (controlPath && ctx.controlOperator !== null) ||
        (appPath && ctx.memberships.some((m) => m.status === "active"));

      if (!allowed) {
        const denied = request.nextUrl.clone();
        denied.pathname = "/acceso-denegado";
        denied.search = "";
        return NextResponse.redirect(denied);
      }
    } catch {
      const denied = request.nextUrl.clone();
      denied.pathname = "/acceso-denegado";
      denied.searchParams.set("error", "plataforma");
      return NextResponse.redirect(denied);
    }
  }

  if (
    user &&
    isAuthFlowPath(pathname) &&
    (pathname === "/actualizar-password" || pathname.startsWith("/actualizar-password/"))
  ) {
    return supabaseResponse;
  }

  if (user && AUTH_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    try {
      const ctx = platformDb
        ? await loadSessionPlatformContext(supabase, user.id)
        : {
            userId: user.id,
            controlOperator: "operator" as const,
            memberships: [{ tenantId: "demo", role: "admin" as const, status: "active" as const }],
          };

      const dest = resolvePostLoginRedirect({
        ctx,
        redirectParam: request.nextUrl.searchParams.get("redirect"),
        enforcePlatformAuthorization: platformDb,
      });
      const next = request.nextUrl.clone();
      next.pathname = dest;
      next.search = "";
      return NextResponse.redirect(next);
    } catch {
      const denied = request.nextUrl.clone();
      denied.pathname = "/acceso-denegado";
      denied.searchParams.set("error", "plataforma");
      return NextResponse.redirect(denied);
    }
  }

  return supabaseResponse;
}
