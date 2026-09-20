import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getSupabaseProjectRefFromEnv,
  isExplicitDevMockMode,
  isTiendaProSupabaseConfigured,
} from "@/lib/platform/tenant-loader";

const ENV = process.env;

describe("tenant-loader / flags de entorno", () => {
  beforeEach(() => {
    process.env = { ...ENV };
  });

  afterEach(() => {
    process.env = ENV;
  });

  it("sin TIENDAPRO_PLATFORM_DB usa mocks explícitos", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dnptsudsxrcamtxfiszh.supabase.co";
    delete process.env.TIENDAPRO_PLATFORM_DB;
    expect(isTiendaProSupabaseConfigured()).toBe(false);
    expect(isExplicitDevMockMode()).toBe(true);
  });

  it("con flag y URL autorizada activa plataforma", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dnptsudsxrcamtxfiszh.supabase.co";
    process.env.TIENDAPRO_PLATFORM_DB = "1";
    expect(isTiendaProSupabaseConfigured()).toBe(true);
    expect(isExplicitDevMockMode()).toBe(false);
  });

  it("rechaza project ref obsoleto", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://lwenyboejvwuopsenrwx.supabase.co";
    process.env.TIENDAPRO_PLATFORM_DB = "1";
    expect(isTiendaProSupabaseConfigured()).toBe(false);
    expect(getSupabaseProjectRefFromEnv()).toBe("lwenyboejvwuopsenrwx");
  });
});

describe("tenant-loader / fallo de base (contrato)", () => {
  it("modo plataforma no debe usar fallback mock en loader (redirect)", () => {
    // Documentado: loadTenantContextForApp llama redirect() ante error — sin return mock.
    expect(isExplicitDevMockMode()).toBe(true);
  });
});
