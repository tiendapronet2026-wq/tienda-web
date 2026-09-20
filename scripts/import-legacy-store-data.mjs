#!/usr/bin/env node
/**
 * Importación aditiva desde Supabase legacy (lwenyboejvwuopsenrwx) → TiendaPro (dnptsudsxrcamtxfiszh).
 * Ejecutar solo con credenciales del proyecto LEGACY en el entorno local del operador.
 * No commitear secretos. No sobrescribe filas existentes por id.
 *
 * Uso:
 *   LEGACY_SUPABASE_URL=https://lwenyboejvwuopsenrwx.supabase.co \
 *   LEGACY_SERVICE_ROLE_KEY=... \
 *   TARGET_SERVICE_ROLE_KEY=... \
 *   node scripts/import-legacy-store-data.mjs --dry-run
 *
 * Requiere acceso owner al proyecto legacy (403 en CLI = vincular org o export Dashboard).
 */

const LEGACY_URL = process.env.LEGACY_SUPABASE_URL;
const LEGACY_KEY = process.env.LEGACY_SERVICE_ROLE_KEY;
const TARGET_URL =
  process.env.TARGET_SUPABASE_URL || "https://dnptsudsxrcamtxfiszh.supabase.co";
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!LEGACY_URL || !LEGACY_KEY || !TARGET_KEY) {
  console.error(
    "Faltan LEGACY_SUPABASE_URL, LEGACY_SERVICE_ROLE_KEY o TARGET_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

async function fetchAll(baseUrl, key, table, select = "*") {
  const rows = [];
  let offset = 0;
  const limit = 500;
  for (;;) {
    const res = await fetch(
      `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&offset=${offset}&limit=${limit}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }
    );
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return rows;
}

async function upsertRows(baseUrl, key, table, rows, onConflict) {
  if (!rows.length) return 0;
  const res = await fetch(
    `${baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }
  );
  if (!res.ok) throw new Error(`upsert ${table}: ${res.status} ${await res.text()}`);
  return rows.length;
}

async function main() {
  const tables = [
    { name: "categories", conflict: "slug" },
    { name: "products", conflict: "slug" },
    { name: "orders", conflict: "id" },
    { name: "order_items", conflict: "id" },
    { name: "customer_addresses", conflict: "id" },
    { name: "quote_requests", conflict: "id" },
  ];

  const report = {};
  for (const { name, conflict } of tables) {
    const legacyRows = await fetchAll(LEGACY_URL, LEGACY_KEY, name);
    report[name] = { legacy: legacyRows.length };
    if (dryRun) continue;
    const targetBefore = (await fetchAll(TARGET_URL, TARGET_KEY, name, "id")).length;
    await upsertRows(TARGET_URL, TARGET_KEY, name, legacyRows, conflict);
    const targetAfter = (await fetchAll(TARGET_URL, TARGET_KEY, name, "id")).length;
    report[name].targetBefore = targetBefore;
    report[name].targetAfter = targetAfter;
  }

  console.log(JSON.stringify({ dryRun, report }, null, 2));
  console.log(
    "Auth users: migrar con Dashboard → Auth export o supabase auth bulk import; contraseñas no exportables — recovery oficial post-import."
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
