/**
 * Autorización de paneles privados (/control, /app) — espejo de reglas RLS.
 */

import type { SessionPlatformContext } from "@/lib/platform/rls-helpers";

export const PRIVATE_PANEL_PREFIXES = ["/control", "/app"] as const;

export function isPrivatePanelPath(pathname: string): boolean {
  return PRIVATE_PANEL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isControlPanelPath(pathname: string): boolean {
  return pathname === "/control" || pathname.startsWith("/control/");
}

export function isAppPanelPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (!isPrivatePanelPath(value) && !value.startsWith("/mi-cuenta")) return null;
  return value;
}

export function canAccessControlPanel(ctx: SessionPlatformContext): boolean {
  return ctx.controlOperator !== null;
}

/** Membresía tenant activa (operadores Control sin membresía no entran a /app). */
export function canAccessAppPanel(ctx: SessionPlatformContext): boolean {
  return ctx.memberships.some((m) => m.status === "active");
}

export function canAccessPrivatePath(ctx: SessionPlatformContext, pathname: string): boolean {
  if (isControlPanelPath(pathname)) return canAccessControlPanel(ctx);
  if (isAppPanelPath(pathname)) return canAccessAppPanel(ctx);
  return true;
}

export type PostLoginRedirectInput = {
  ctx: SessionPlatformContext;
  redirectParam: string | null;
  /** Cuando true, exige operador/membresía según destino. */
  enforcePlatformAuthorization: boolean;
};

export function resolvePostLoginRedirect({
  ctx,
  redirectParam,
  enforcePlatformAuthorization,
}: PostLoginRedirectInput): string {
  const explicit = safeRedirectPath(redirectParam);

  if (explicit) {
    if (!enforcePlatformAuthorization) return explicit;
    if (canAccessPrivatePath(ctx, explicit)) return explicit;
    return "/acceso-denegado";
  }

  if (!enforcePlatformAuthorization) return "/app";

  if (canAccessControlPanel(ctx)) return "/control";
  if (canAccessAppPanel(ctx)) return "/app";
  return "/acceso-denegado";
}

export function sanitizeSignInRedirect(redirectTo: string, ctx: SessionPlatformContext, enforce: boolean): string {
  const safe = safeRedirectPath(redirectTo) ?? "/app";
  if (!enforce) return safe;
  if (isPrivatePanelPath(safe) && !canAccessPrivatePath(ctx, safe)) {
    return "/acceso-denegado";
  }
  return safe;
}
