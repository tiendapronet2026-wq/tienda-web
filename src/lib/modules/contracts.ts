import type { ModuleId } from "./registry";

/** Contrato de integración — venta online emite eventos; stock los procesa si está activo. */
export interface VentaOnlineModuleContract {
  readonly moduleId: "venta-online";
  createOrder(input: unknown): Promise<{ orderId: string }>;
}

export interface StockModuleContract {
  readonly moduleId: "stock";
  applyMovement(input: { sku: string; delta: number; reference: string }): Promise<void>;
}

export interface PosModuleContract {
  readonly moduleId: "pos";
  closeTicket(input: unknown): Promise<{ ticketId: string; total: number }>;
}

export interface CrmModuleContract {
  readonly moduleId: "crm";
  upsertContact(input: unknown): Promise<{ contactId: string }>;
}

export type ModuleContractMap = {
  "venta-online": VentaOnlineModuleContract;
  stock: StockModuleContract;
  pos: PosModuleContract;
  crm: CrmModuleContract;
};

export type ImplementedModuleContracts = Partial<ModuleContractMap>;

/** Placeholder hasta implementación por módulo. */
export function notImplementedModule(moduleId: ModuleId): never {
  throw new Error(`Módulo ${moduleId}: contrato no implementado (fase scaffold).`);
}
