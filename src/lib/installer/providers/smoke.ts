import type { ProviderVerifyResult } from "@/lib/installer/providers/types";

export async function runInstallSmokeTests(deploymentUrl: string): Promise<ProviderVerifyResult> {
  const base = deploymentUrl.replace(/\/$/, "");
  const paths = ["/productos", "/login"];

  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, { redirect: "follow", cache: "no-store" });
      if (res.status >= 500) {
        return { ok: false, status: "failed", message: `Smoke ${path} HTTP ${res.status}` };
      }
    } catch {
      return { ok: false, status: "failed", message: `Smoke ${path} no alcanzable` };
    }
  }

  return { ok: true, status: "ok", message: "Smoke tests HTTP OK (/productos, /login)" };
}
