/**
 * TIENDAPRO_DIGITAL_SMOKE_ENABLED en production (0|1) + un deploy prod.
 * Uso: set VERCEL_TOKEN=... && node scripts/vercel-set-digital-smoke-env.mjs 1
 */
import { execSync } from "node:child_process";

const value = process.argv[2]?.trim();
if (value !== "0" && value !== "1") {
  console.error("usage: node vercel-set-digital-smoke-env.mjs <0|1>");
  process.exit(1);
}

const token = process.env.VERCEL_TOKEN?.trim();
const useCliOnly = !token;
if (useCliOnly) {
  console.log("VERCEL_TOKEN ausente; usando Vercel CLI autenticada.");
}

const projectId = "prj_n41rgYHhVM6UAGlzpowVkuubXFJ9L";
const teamId = "team_mPXJ536vJfnq4cqHsSzERgEQY";

if (useCliOnly) {
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
} else {
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const listJson = await listRes.json();
  const existing = (listJson.envs ?? []).find((e) => e.key === "TIENDAPRO_DIGITAL_SMOKE_ENABLED");

  if (existing?.id) {
    const patchRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}?teamId=${teamId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value, target: ["production"], type: "plain" }),
      },
    );
    if (!patchRes.ok) {
      console.error("patch_fail", patchRes.status);
      process.exit(1);
    }
  } else {
    const postRes = await fetch(
      `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "TIENDAPRO_DIGITAL_SMOKE_ENABLED",
          value,
          type: "plain",
          target: ["production"],
        }),
      },
    );
    if (!postRes.ok) {
      console.error("post_fail", postRes.status);
      process.exit(1);
    }
  }
}

console.log("smoke_env_set=" + value);
execSync("npx vercel deploy --prod --yes", { stdio: "inherit", cwd: process.cwd() });
console.log("deploy_ok");
