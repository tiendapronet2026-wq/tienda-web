import { afterEach, describe, expect, it } from "vitest";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

describe("supabase env", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("prefers publishable over anon", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dnptsudsxrcamtxfiszh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";
    expect(getSupabasePublishableKey()).toBe("sb_publishable_test");
  });

  it("falls back to anon", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dnptsudsxrcamtxfiszh.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";
    expect(getSupabasePublishableKey()).toBe("legacy_anon");
  });

  it("prefers secret over service role", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://dnptsudsxrcamtxfiszh.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy_jwt";
    expect(getSupabaseSecretKey()).toBe("sb_secret_test");
  });

  it("requires url", () => {
    expect(() => getSupabaseUrl()).toThrow();
  });
});
