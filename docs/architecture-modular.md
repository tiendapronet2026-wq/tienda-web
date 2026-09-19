# TiendaPro — Arquitectura modular consolidada

> **Estado real (PR #1):** monolito modular Next.js · datos demo · sin SQL remoto · sin merge producción  
> **Supabase esperado:** `lwenyboejvwuopsenrwx` · no Casa León

## 1. Dos capas de producto

| Capa | Ruta | Audiencia | Contenido |
|------|------|-----------|-----------|
| **TiendaPro Control** | `/control/*` | Propietario TiendaPro | Tenants, solicitudes, proyectos, agentes, informes, versiones, despliegues |
| **TiendaPro SaaS (App cliente)** | `/app/*` | Usuario de cada tenant | Módulos contratados, CRM, informes, asistente |
| **Showroom público** | `/`, `/servicios`, `/modulos`, `/demos` | Público | Comercial + catálogo + demos ficticias |

**Regla:** Control ≠ App cliente. `/panel` redirige a Control o rutas nuevas (compat).

Demos públicas llevan banner: **no son paneles privados autenticados**.

## 2. Núcleo y módulos (código)

- `src/lib/core/` — orgs, usuarios, roles, proyectos, auditoría, eventos.
- `src/lib/modules/registry.ts` — catálogo módulos + `requiredRules` + `optionalIntegrations`.
- `src/lib/plans/resolve-modules.ts` — activación efectiva, integraciones, suspensión.
- `src/lib/tenant/` — entitlements demo + `assertModuleAccess`.
- `src/lib/auth/claims.ts` — realms `control` | `tenant-app` (preparación persistencia).

## 3. Dependencias corregidas

| Módulo | Activación | Integraciones opcionales |
|--------|------------|---------------------------|
| POS | **Independiente** | Stock → sync tickets |
| Venta online | Independiente | Stock → descuenta pedidos |
| Finanzas | Requiere **POS o venta online** (any) | Stock → valuación |
| Delivery | Requiere venta online activa | — |
| Stock | Independiente | — |

- **Contratado ≠ activo:** se evalúa fixpoint sobre reglas duras.
- **Suspendido:** datos conservados; integraciones que dependen del partner se **deshabilitan** sin apagar el módulo host (ej. POS activo, sync stock off).

Pruebas: `npm test` → `src/lib/plans/resolve-modules.test.ts` (Vitest).

## 4. Planes comerciales

- `src/lib/plans/catalog.ts` — base + add-ons + módulos incluidos.
- Importes en UI = **ejemplos**, no tarifas definitivas ni cobro real.
- Operaciones modeladas: add-on, suspensión, cambio de plan, config por tenant.

## 5. Showroom

Etiquetas por módulo (`showcaseStatus`): **Demo** · **Funcional** · **Próximamente**.

Demos en `/demos/*` — solo datos ficticios; sin producción.

## 6. Agentes

- Pipeline existente: interpretación → validación → reglas → herramientas → auditoría.
- `src/lib/agents/operations-contract.ts` — informes/tareas entrantes; **sin ejecución arbitraria**; aprobación futura.

## 7. Supabase (diseño, no ejecutado)

Migraciones futuras (por namespace de módulo):

1. **Núcleo:** `tenants`, `tenant_users`, `roles`, `tenant_modules` (estado + config JSON), `plans`, `audit_log` — columna `tenant_id` en todas las tablas de negocio.
2. **RLS:** políticas `tenant_id = auth.jwt()->>'tenant_id'` (o membership table); rol Control en realm separado / service role acotado.
3. **Auth:** Supabase Auth + claims custom; validar en servidor antes de cualquier query real.

**No ejecutar SQL remoto** hasta verificar MCP/proyecto TiendaPro.

## 8. Despliegue

- Shared (default) vs dedicated — campo en `TenantConfig`.
- Dominios custom preparados; sin auto-aprovisionamiento.
- Vercel: `tiendapronet2026-wqs-projects/tienda-web` — previews automáticos en PR.

## 9. Rutas validadas

- Navegación pública → Control/App demo → Showroom.
- Responsive vía layout existente + `tp-container`.
- Legacy → redirects en `middleware.ts`.

## 10. Próximo paso único

Ver **`docs/supabase-connection-and-audit.md`**: MCP → ref `lwenyboejvwuopsenrwx` → autorizar migración `20260919120000_platform_saas_core.sql` → `TIENDAPRO_PLATFORM_DB=1`.
