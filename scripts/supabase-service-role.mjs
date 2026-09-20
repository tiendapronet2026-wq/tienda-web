import { execSync } from "node:child_process";

/** Solo entorno CI/agente con Supabase CLI autenticado. No loguear la clave. */
export function resolveSupabaseServiceRoleKey() {
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fromEnv && fromEnv.length > 40 && !fromEnv.includes("[SENSITIVE]")) {
    return fromEnv;
  }
  try {
    const raw = execSync(
      "npx supabase@2.117.0 projects api-keys --project-ref dnptsudsxrcamtxfiszh",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const parsed = JSON.parse(raw);
    const key = parsed.keys?.find((k) => k.id === "service_role")?.api_key;
    return key ?? null;
  } catch {
    return null;
  }
}
