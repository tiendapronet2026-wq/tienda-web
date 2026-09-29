import "server-only";

const DEFAULT_MM_BASE = "https://mente-maestra.tiendapro-net-2026.workers.dev";

export function mmControlConfigured(): boolean {
  return Boolean(
    process.env.MM_TIENDAPRO_CONTROL_BRIDGE_SECRET?.trim() &&
      (process.env.MM_CONTROL_API_BASE_URL?.trim() || DEFAULT_MM_BASE)
  );
}

export async function mmControlFetch<T>(
  path: string,
  init: RequestInit & { actorRef?: string } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const secret = process.env.MM_TIENDAPRO_CONTROL_BRIDGE_SECRET?.trim();
  const base = (process.env.MM_CONTROL_API_BASE_URL?.trim() || DEFAULT_MM_BASE).replace(/\/$/, "");
  if (!secret) {
    return { ok: false, status: 503, error: "mm_control_not_configured" };
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${secret}`);
  headers.set("Accept", "application/json");
  if (init.actorRef) headers.set("X-Control-Actor-Ref", init.actorRef.slice(0, 120));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${base}/api/control/v1${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, status: res.status, error: "invalid_mm_response" };
  }

  if (!res.ok) {
    const err =
      json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `mm_http_${res.status}`;
    return { ok: false, status: res.status, error: err };
  }

  return { ok: true, data: json as T };
}
