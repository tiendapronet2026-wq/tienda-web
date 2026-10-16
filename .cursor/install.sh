#!/usr/bin/env bash
# Idempotent repository bootstrap for the TiendaPro Cloud Agent environment.
# Runs after the repository is checked out. Must terminate (no long-running
# processes here). Docker / Supabase are brought up per-boot by start.sh.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[install] Installing Node dependencies (npm ci)..."
npm ci

# Local Supabase uses deterministic demo keys derived from the default JWT
# secret in supabase/config.toml, so the client env is static. Only create the
# file if it does not already exist, to avoid clobbering local overrides.
if [ ! -f .env.local ]; then
  echo "[install] Writing .env.local for local Supabase..."
  cat > .env.local <<'ENV'
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV
else
  echo "[install] .env.local already present, leaving it untouched."
fi

echo "[install] Done."
