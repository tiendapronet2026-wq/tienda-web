# Usuarios de prueba — entrega digital (prod)

Cuentas `@example.invalid` en Supabase prod son **solo para gates automatizados** (RLS, BOM, etc.). No usar contraseñas conocidas en documentación ni rotar credenciales vía SQL.

| Email | Uso |
|-------|-----|
| `test-g2a-nonadmin-prod@example.invalid` | Customer no-admin (G2 BOM / RLS) |
| `test-gate1-nonadmin-7f3a9c12@example.invalid` | Customer no-admin (G1 costes) |

**Política:** credenciales se invalidan tras smokes que las toquen; el siguiente acceso debe hacerse con **Supabase Dashboard → Authentication → usuario → Send password recovery** (solo si el dominio lo permite) o **registro de un usuario smoke dedicado** vía `/registro` y pedido `[DIGITAL_TEST]` asociado a ese `user_id`.

Smokes E2E de Pack 150 en prod deben preferir un comprador creado en la misma corrida por flujo normal de registro (`/registro` o Supabase `signUp`), salvo reutilización explícita con credencial ya gestionada en el equipo.

Cuentas creadas solo para smoke Pack 150 (oct-2026) se invalidan al cerrar la corrida; no reutilizar sin nuevo registro.
