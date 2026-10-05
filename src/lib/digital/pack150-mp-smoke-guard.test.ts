import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluatePack150SmokeAccess } from "@/lib/digital/pack150-mp-smoke-guard";
import {
  PACK_150_PRODUCT_SLUG,
  SMOKE_MP_CANONICAL_PRICE_ARS,
  SMOKE_MP_PRODUCT_SLUG,
} from "@/lib/digital/constants";

describe("mp monetary smoke guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies unauthenticated", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: false,
      isAdmin: false,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: true,
    });
    expect(r).toEqual({ allowed: false, reason: "unauthenticated" });
  });

  it("denies non-admin", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: false,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: true,
    });
    expect(r).toEqual({ allowed: false, reason: "not_admin" });
  });

  it("denies when digital smoke flag OFF", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      digitalSmokeEnabled: false,
      mpOrdersEnabled: true,
    });
    expect(r).toEqual({ allowed: false, reason: "smoke_disabled" });
  });

  it("denies when mp orders flag OFF", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: false,
    });
    expect(r).toEqual({ allowed: false, reason: "mp_checkout_disabled" });
  });

  it("denies commercial Pack 150 slug", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: true,
      requestedProductSlug: PACK_150_PRODUCT_SLUG,
      serverPrice: 29999,
    });
    expect(r).toEqual({ allowed: false, reason: "wrong_product" });
  });

  it("denies wrong product slug", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: true,
      requestedProductSlug: "otro-producto",
    });
    expect(r).toEqual({ allowed: false, reason: "wrong_product" });
  });

  it("denies when smoke DB price is not ARS 1000", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: true,
      requestedProductSlug: SMOKE_MP_PRODUCT_SLUG,
      serverPrice: 29999,
    });
    expect(r).toEqual({ allowed: false, reason: "invalid_smoke_price" });
  });

  it("denies manipulated client price", () => {
    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      digitalSmokeEnabled: true,
      mpOrdersEnabled: true,
      requestedProductSlug: SMOKE_MP_PRODUCT_SLUG,
      clientPrice: 1,
      serverPrice: SMOKE_MP_CANONICAL_PRICE_ARS,
    });
    expect(r).toEqual({ allowed: false, reason: "price_tamper" });
  });

  it("allows admin with flags ON and smoke product at 1000", () => {
    vi.stubEnv("TIENDAPRO_DIGITAL_SMOKE_ENABLED", "1");
    vi.stubEnv("TIENDAPRO_MP_ORDERS_CHECKOUT_ENABLED", "1");
    vi.stubEnv("TIENDAPRO_CHECKOUT_ENABLED", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TIENDAPRO_CHECKOUT_PRODUCTION", "1");

    const r = evaluatePack150SmokeAccess({
      isAuthenticated: true,
      isAdmin: true,
      requestedProductSlug: SMOKE_MP_PRODUCT_SLUG,
      serverPrice: SMOKE_MP_CANONICAL_PRICE_ARS,
      clientPrice: SMOKE_MP_CANONICAL_PRICE_ARS,
    });
    expect(r).toEqual({ allowed: true });
  });

  it("pack commercial canonical slug unchanged", () => {
    expect(PACK_150_PRODUCT_SLUG).toBe("pack-150-cursos-digitales-bonos");
  });
});
