#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB="${BASELINE_TEST_DB:-tiendapro_baseline_test}"

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop database if exists ${DB};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create database ${DB};"

run_sql() {
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB" -f "$1"
}

run_sql "$ROOT/supabase/tests/isolated/00_supabase_roles.sql"
run_sql "$ROOT/supabase/migrations/20260920000000_tiendapro_baseline.sql"
run_sql "$ROOT/supabase/tests/isolated/99_rls_assertions.sql"

echo "OK: baseline + RLS tests on local PostgreSQL ($DB)"
