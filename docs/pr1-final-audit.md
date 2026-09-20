# PR #1 — Auditoría final (referencia)

Auditoría agente 2026-09-20 · commit `0485943`+ · rama `cursor/tiendapro-master-config-7932`.

## Calidad repo

| Gate | Estado |
|------|--------|
| `npm run lint` | PASS |
| `npm test` (28) | PASS |
| `npm run build` | PASS |
| GitHub CI validate | PASS |
| Vercel Preview | PASS |

## Supabase `dnptsudsxrcamtxfiszh`

- **Migración repo:** `20260920000000_tiendapro_baseline.sql`
- **Historial remoto:** 2 entradas (`20260919215500`, `20260919215631`, mismo nombre) — no reaplicar
- **Tablas public:** 9 tablas plataforma (baseline); **sin** `products` / `orders` (catálogo legacy)
- **Auth Site URL:** `https://www.tiendapro.net`
- **Storage Vector 402:** tier free; remoto `vector.enabled=false`; app no usa vector buckets

## Publicación (master / Production)

Ver informe de agente: bloqueos env Production, allow list prod, catálogo legacy vs baseline.
