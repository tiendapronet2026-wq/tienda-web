# TiendaPro — Informe de arquitectura modular (SaaS)

> Estado: **fase scaffold + demos ficticias** · sin integraciones reales · sin SQL remoto · PR #1  
> Prioridad: esta directriz **prevalece** sobre decisiones monolíticas anteriores.

## 1. Objetivo

Construir TiendaPro como plataforma **SaaS modular, escalable y comercializable** para múltiples clientes, evitando un monolito funcional donde todo depende de todo.

## 2. Enfoque de despliegue

| Aspecto | Decisión |
|---------|----------|
| Estilo | Monolito modular (Next.js App Router) |
| Microservicios | No en esta fase |
| Multicliente | `tenantId` + entitlements; RLS Supabase pendiente de conexión verificada |
| Despliegue | `shared` (default) o `dedicated` por tenant — sin auto-aprovisionamiento |
| Dominios custom | Campos preparados; sin automatización DNS/BD aún |

## 3. Núcleo común (`src/lib/core/`)

| Capacidad | Estado código |
|-----------|----------------|
| Organizaciones / tenants | Tipos + contratos |
| Usuarios y roles | Tipos `RoleId`, `Permission` |
| Proyectos | Tipo `Project` |
| Planes comerciales | Ver `src/lib/plans/` |
| Catálogo de módulos | Ver `src/lib/modules/registry.ts` |
| Activaciones | `resolveActiveModules`, `isModuleEnabledForTenant` |
| Configuración tenant | `TenantConfig` en `src/lib/tenant/context.ts` |
| Auditoría | Tipo `AuditEntryCore`; persistencia futura |
| Integración | `DomainEvent`, `CoreServicesContract` |

## 4. Módulos de producto

| ID | Dependencias | Madurez | Demo / panel |
|----|--------------|---------|--------------|
| `venta-online` | — | demo | `/demos/tienda` |
| `stock` | — | scaffold | — |
| `pos` | stock | demo | `/demos/pos` |
| `crm` | — | scaffold | `/panel/clientes` |
| `chatbot` | — | demo | `/demos/chatbot`, `/panel/agentes` |
| `delivery` | venta-online | scaffold | — |
| `finanzas` | venta-online, pos | scaffold | — |
| `reportes` | — | demo | `/demos/dashboard`, `/panel/informes` |

Cada módulo declara: `migrationNamespace`, permisos, contratos parciales en `src/lib/modules/contracts.ts`.

**Ejemplo de integración:** venta online / POS publican eventos; **stock** procesa movimientos solo si está **activo** para el tenant (lógica en capa de aplicación; bus de eventos tipado en core).

## 5. Planes comerciales (`src/lib/plans/catalog.ts`)

- **Starter**, **Growth**, **Enterprise**, **Custom** (referencia).
- Precios mensuales **ficticios** (ARS); **no** hay cobros ni suscripciones automáticas.
- Operaciones soportadas en modelo: incluir módulos, add-ons, suspender sin borrar, cambiar plan.

Tenant demo: `tenant_demo_horizonte` — plan Growth + add-on chatbot, delivery suspendido.

## 6. Multicliente y seguridad

- Aislamiento lógico por `tenantId` en tipos y resolución de módulos.
- `assertModuleAccess` en `src/lib/tenant/access.ts` — patrón para checks servidor.
- **RLS:** diseñar políticas por `tenant_id` cuando se apliquen migraciones remotas; **no ejecutadas** en esta entrega.
- Prohibido usar Supabase Casa León.

## 7. Capa de presentación (entrega actual)

| Superficie | Ruta | Notas |
|------------|------|-------|
| Web comercial | `/`, `/servicios` | Servicios de negocio TiendaPro |
| Catálogo modular | `/modulos` | Módulos + planes referencia |
| Showroom | `/demos/*` | Datos ficticios explícitos |
| Panel | `/panel/*` | Resumen, módulos, CRM mock, agentes, informes, config |

## 8. Centro de agentes

- `src/lib/agents/` — pipeline interpretación → validación → reglas → herramientas → auditoría.
- Chatbot es **módulo**; sin WhatsApp/Instagram/APIs externas.

## 9. Qué no está implementado (honesto)

- Persistencia Supabase del núcleo y módulos.
- Cobros, facturación real, suscripciones.
- Aprovisionamiento dominios/BD dedicadas.
- Implementaciones completas de stock, delivery, finanzas (solo contratos/scaffold).
- Auto-despliegue por cliente.

## 10. Próximos pasos (post-autorización)

1. Conectar MCP Supabase proyecto TiendaPro (`lwenyboejvwuopsenrwx`).
2. Migraciones versionadas: tablas núcleo (`tenants`, `tenant_modules`, `plans`, …) con RLS.
3. Auth real enlazada a tenant + roles.
4. Implementar bus de eventos en servidor y primer módulo productivo (p. ej. venta-online).
5. Merge PR #1 cuando el equipo autorice preview/producción.

## 11. Referencias en repo

- `AGENTS.md` — reglas persistentes actualizadas.
- `.cursor/rules/tiendapro-modular.mdc` — reglas Cursor scoped.
- Código: `src/lib/{core,modules,plans,tenant}/`.
