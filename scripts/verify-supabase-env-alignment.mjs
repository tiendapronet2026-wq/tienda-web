/**
 * Comprueba que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY apunten al mismo proyecto.
 * No imprime secretos.
 */
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

function refFromSupabaseUrl(url) {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function refFromJwt(jwt) {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return json.ref ?? null;
  } catch {
    return null;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !serviceKey) {
  console.error("SUPABASE_ENV_MISSING");
  process.exit(1);
}

const urlRef = refFromSupabaseUrl(url);
const keyRef = refFromJwt(serviceKey);

if (!urlRef || !keyRef) {
  console.error("SUPABASE_ENV_PARSE_FAIL");
  process.exit(1);
}

const AUTHORIZED_REF = "dnptsudsxrcamtxfiszh";
const DEPRECATED_REF = "lwenyboejvwuopsenrwx";

if (urlRef !== keyRef) {
  console.error("SUPABASE_ENV_MISMATCH", { urlRef, keyRef });
  process.exit(2);
}

if (urlRef === DEPRECATED_REF) {
  console.error("SUPABASE_ENV_DEPRECATED_REF", DEPRECATED_REF);
  process.exit(3);
}

if (urlRef !== AUTHORIZED_REF) {
  console.warn("SUPABASE_ENV_UNEXPECTED_REF", urlRef, "expected", AUTHORIZED_REF);
}

console.log("SUPABASE_ENV_ALIGNED", urlRef);
process.exit(0);
