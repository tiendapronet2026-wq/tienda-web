/**
 * TIENDAPRO_DIGITAL_SMOKE_ENABLED en production (0|1) + un deploy prod.
 * Requiere Vercel CLI autenticada en el directorio del proyecto (`.vercel/project.json`).
 * Uso: node scripts/vercel-set-digital-smoke-env.mjs 0|1
 */
import { execSync } from "node:child_process";

const value = process.argv[2]?.trim();
if (value !== "0" && value !== "1") {
  console.error("usage: node vercel-set-digital-smoke-env.mjs <0|1>");
  process.exit(1);
}

try {
  execSync(`npx vercel env rm TIENDAPRO_DIGITAL_SMOKE_ENABLED production --yes`, {
    stdio: "ignore",
    cwd: process.cwd(),
  });
} catch {
  /* no existía */
}

execSync(`npx vercel env add TIENDAPRO_DIGITAL_SMOKE_ENABLED production --yes`, {
  stdio: ["pipe", "inherit", "inherit"],
  cwd: process.cwd(),
  input: value,
});

console.log("smoke_env_set=" + value);
execSync("npx vercel deploy --prod --yes", { stdio: "inherit", cwd: process.cwd() });
console.log("deploy_ok");
