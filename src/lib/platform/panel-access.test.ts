import { describe, expect, it } from "vitest";
import {
  canAccessAppPanel,
  canAccessControlPanel,
  canAccessPrivatePath,
  isPrivatePanelPath,
  resolvePostLoginRedirect,
  safeRedirectPath,
  sanitizeSignInRedirect,
} from "@/lib/platform/panel-access";
import type { SessionPlatformContext } from "@/lib/platform/rls-helpers";

const operatorOnly: SessionPlatformContext = {
  userId: "op",
  controlOperator: "operator",
  memberships: [],
};

const memberOnly: SessionPlatformContext = {
  userId: "m",
  controlOperator: null,
  memberships: [{ tenantId: "t1", role: "admin", status: "active" }],
};

const nobody: SessionPlatformContext = {
  userId: "x",
  controlOperator: null,
  memberships: [],
};

describe("panel-access / rutas privadas", () => {
  it("detecta /control y /app", () => {
    expect(isPrivatePanelPath("/control")).toBe(true);
    expect(isPrivatePanelPath("/control/clientes")).toBe(true);
    expect(isPrivatePanelPath("/app/modulos")).toBe(true);
    expect(isPrivatePanelPath("/login")).toBe(false);
    expect(isPrivatePanelPath("/recuperar-password")).toBe(false);
  });

  it("safeRedirectPath bloquea open redirect", () => {
    expect(safeRedirectPath("//evil.com")).toBeNull();
    expect(safeRedirectPath("https://x")).toBeNull();
    expect(safeRedirectPath("/control")).toBe("/control");
    expect(safeRedirectPath("/checkout")).toBe("/checkout");
    expect(safeRedirectPath("/productos/foo")).toBe("/productos/foo");
    expect(safeRedirectPath("/demos")).toBeNull();
  });
});

describe("panel-access / autorización plataforma", () => {
  it("control solo con operador", () => {
    expect(canAccessControlPanel(operatorOnly)).toBe(true);
    expect(canAccessControlPanel(memberOnly)).toBe(false);
  });

  it("app solo con membresía activa", () => {
    expect(canAccessAppPanel(memberOnly)).toBe(true);
    expect(canAccessAppPanel(operatorOnly)).toBe(false);
  });

  it("paths privados respetan rol", () => {
    expect(canAccessPrivatePath(operatorOnly, "/control")).toBe(true);
    expect(canAccessPrivatePath(operatorOnly, "/app")).toBe(false);
    expect(canAccessPrivatePath(memberOnly, "/app")).toBe(true);
    expect(canAccessPrivatePath(nobody, "/app")).toBe(false);
  });
});

describe("panel-access / post-login", () => {
  it("modo plataforma: operador va a /control por defecto", () => {
    expect(
      resolvePostLoginRedirect({
        ctx: operatorOnly,
        redirectParam: null,
        enforcePlatformAuthorization: true,
      })
    ).toBe("/control");
  });

  it("modo plataforma: miembro va a /app por defecto", () => {
    expect(
      resolvePostLoginRedirect({
        ctx: memberOnly,
        redirectParam: null,
        enforcePlatformAuthorization: true,
      })
    ).toBe("/app");
  });

  it("modo plataforma: sin rol → acceso denegado", () => {
    expect(
      resolvePostLoginRedirect({
        ctx: nobody,
        redirectParam: null,
        enforcePlatformAuthorization: true,
      })
    ).toBe("/acceso-denegado");
  });

  it("modo plataforma: redirect /control sin operador → denegado", () => {
    expect(
      resolvePostLoginRedirect({
        ctx: memberOnly,
        redirectParam: "/control",
        enforcePlatformAuthorization: true,
      })
    ).toBe("/acceso-denegado");
  });

  it("modo dev: permite redirect explícito sin enforcement", () => {
    expect(
      resolvePostLoginRedirect({
        ctx: nobody,
        redirectParam: "/control",
        enforcePlatformAuthorization: false,
      })
    ).toBe("/control");
  });

  it("signIn sanitiza destino en modo plataforma", () => {
    expect(sanitizeSignInRedirect("/control", memberOnly, true)).toBe("/acceso-denegado");
    expect(sanitizeSignInRedirect("/app", memberOnly, true)).toBe("/app");
    expect(sanitizeSignInRedirect("/checkout", nobody, true)).toBe("/checkout");
    expect(sanitizeSignInRedirect("/control", memberOnly, false)).toBe("/control");
  });
});

describe("middleware legacy (contrato)", () => {
  it("/login y /registro no deben redirigirse a /control", () => {
    const legacyPrefixes = ["/productos", "/carrito", "/cotizacion", "/mi-cuenta"];
    expect(legacyPrefixes).not.toContain("/login");
    expect(legacyPrefixes).not.toContain("/registro");
  });
});
