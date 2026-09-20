# Continuidad de datos — Supabase

## Decisión propietario (2026-09-20, definitiva)

La base anterior (`lwenyboejvwuopsenrwx`) contenía **solo pruebas**. No hay datos comerciales a migrar.

- **Base oficial:** `dnptsudsxrcamtxfiszh`
- **Legacy:** sin recuperación planificada; no bloquea operación ni checkout en producción.
- Importador aditivo opcional (referencia): `scripts/import-legacy-store-data.mjs` — no requerido para go-live.

## Checkout producción

Activado con `TIENDAPRO_CHECKOUT_ENABLED=1` y `TIENDAPRO_CHECKOUT_PRODUCTION=1` en Vercel Production.

## Catálogo seed

6 productos / 3 categorías en la base oficial. Admin comercial: `tiendapro.net.2026@gmail.com` (Auth oficial).
