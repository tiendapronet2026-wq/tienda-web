import { defineConfig, devices } from "@playwright/test";

const previewUrl =
  process.env.PREVIEW_URL ??
  "https://tienda-itekq6uzm-tiendapronet2026-wqs-projects.vercel.app";
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!bypass) {
  throw new Error(
    "VERCEL_AUTOMATION_BYPASS_SECRET requerido (scripts/run-e2e-preview.mjs lo obtiene vía Vercel CLI)."
  );
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: previewUrl,
    ...devices["Desktop Chrome"],
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypass,
    },
  },
});
