#!/usr/bin/env node
/**
 * E2E checkout en Preview con bypass autorizado de Vercel (sin desactivar protección).
 * Uso: node scripts/run-e2e-preview.mjs [PREVIEW_URL]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const previewUrl =
  process.argv[2] ??
  process.env.PREVIEW_URL ??
  "https://tienda-itekq6uzm-tiendapronet2026-wqs-projects.vercel.app";

function loadAnonFromPreviewEnv() {
  const envPath = path.join(process.cwd(), ".env.preview");
  if (!fs.existsSync(envPath)) {
    execSync("vercel env pull .env.preview --environment=preview --yes", { stdio: "inherit" });
  }
  const text = fs.readFileSync(envPath, "utf8");
  const anon = text.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="([^"]+)"/)?.[1];
  const url = text.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)?.[1];
  if (!anon || !url) {
    throw new Error("No se pudieron leer claves Supabase de .env.preview");
  }
  return { anon, url };
}

function loadBypassSecret() {
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    return process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  const raw = execSync("vercel project protection tienda-web", { encoding: "utf8" });
  const jsonStart = raw.indexOf("{");
  const json = JSON.parse(raw.slice(jsonStart));
  const entry = Object.entries(json.protectionBypass ?? {}).find(
    ([, meta]) => meta.scope === "automation-bypass"
  );
  if (!entry) {
    throw new Error("No hay protectionBypass automation en el proyecto Vercel");
  }
  return entry[0];
}

import { resolveSupabaseServiceRoleKey } from "./supabase-service-role.mjs";

const { anon, url } = loadAnonFromPreviewEnv();
const bypass = loadBypassSecret();
const serviceKey = resolveSupabaseServiceRoleKey();

process.env.PREVIEW_URL = previewUrl;
process.env.VERCEL_AUTOMATION_BYPASS_SECRET = bypass;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anon;
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
if (serviceKey) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
}
console.log("E2E Preview:", previewUrl);
execSync("npx playwright test e2e/checkout-preview.spec.ts", {
  stdio: "inherit",
  env: process.env,
});
