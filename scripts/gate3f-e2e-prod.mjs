/**
 * Smoke E2E Gate 3F contra www.tiendapro.net (sin loguear secretos).
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i);
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const PROD_REF = "dnptsudsxrcamtxfiszh";
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tiendapro.net").replace(/\/$/, "");
const serviceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY_PROD ?? process.env.SUPABASE_SERVICE_ROLE_KEY
)?.trim();
const adminId = "d32d6ad7-5a5a-4e30-b130-45f5e0eee019";
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL_PROD ??
  (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(PROD_REF)
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : `https://${PROD_REF}.supabase.co`);

if (!serviceKey || !url) {
  console.error("Faltan SUPABASE_SERVICE_ROLE_KEY_PROD (o KEY de prod) para smoke contra tiendapro.net");
  process.exit(1);
}

if (!url.includes(PROD_REF)) {
  console.error("GATE_3F_E2E_PROD_WRONG_PROJECT");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function confirm(token) {
  const res = await fetch(`${site}/api/integrations/connect/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const token = randomBytes(32).toString("base64url");
  const hash = hashToken(token);

  const { error: insErr } = await supabase.from("integration_link_sessions").insert({
    provider: "link_demo",
    requested_by: adminId,
    one_time_token_hash: hash,
    status: "pending",
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
  if (insErr) throw new Error(insErr.message);

  const pageRes = await fetch(`${site}/connect/${encodeURIComponent(token)}`);
  if (!pageRes.ok) throw new Error(`connect page ${pageRes.status}`);

  const c1 = await confirm(token);
  const errMsg = String(c1.body?.error ?? "");
  if (errMsg.includes("INTEGRATION_CREDENTIALS_KEY")) {
    console.log("GATE_3F_BLOCKED_VERCEL_ENV");
    process.exit(2);
  }
  if (c1.status !== 200 || !c1.body?.ok) {
    throw new Error(`confirm: ${c1.status} ${errMsg}`);
  }

  console.log("GATE_3F_E2E_PROD_OK");
}

main().catch((e) => {
  console.error("GATE_3F_E2E_PROD_FAIL", e.message);
  process.exit(1);
});
