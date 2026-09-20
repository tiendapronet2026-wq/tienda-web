import type { CoreServicesContract } from "./types";

/**
 * Punto de extensión del núcleo.
 * Implementación real conectará Supabase + RLS; hoy solo define la forma.
 */
export type CoreModuleBridge = {
  core: CoreServicesContract;
};

/** Eventos entre módulos (sin dependencias circulares directas). */
export type DomainEvent =
  | { type: "sale.completed"; tenantId: string; payload: { orderId: string; lines: unknown[] } }
  | { type: "stock.movement.requested"; tenantId: string; payload: { sku: string; delta: number; source: string } }
  | { type: "pos.ticket.closed"; tenantId: string; payload: { ticketId: string; total: number } };

export type DomainEventBus = {
  publish(event: DomainEvent): Promise<void>;
};

export type ModuleIntegrationContext = {
  tenantId: string;
  bridge: CoreModuleBridge;
  events: DomainEventBus;
};
