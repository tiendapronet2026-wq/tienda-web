import { linkDemoProvider } from "@/lib/integrations/providers/link-demo";
import type { IntegrationProvider, IntegrationProviderId } from "@/lib/integrations/providers/types";

const providers: IntegrationProvider[] = [linkDemoProvider];

const catalogCards: {
  id: IntegrationProviderId;
  title: string;
  subtitle: string;
  isImplemented: boolean;
}[] = [
  {
    id: "whatsapp",
    title: "WhatsApp / Meta",
    subtitle: "Mensajería y Embedded Signup",
    isImplemented: false,
  },
  {
    id: "mercadopago",
    title: "Mercado Pago",
    subtitle: "Cobros y OAuth",
    isImplemented: false,
  },
  {
    id: "link_demo",
    title: "Laboratorio de vinculación",
    subtitle: "Prueba el flujo QR sin proveedor externo",
    isImplemented: true,
  },
];

export function getIntegrationProvider(id: string): IntegrationProvider | null {
  return providers.find((p) => p.id === id) ?? null;
}

export function listIntegrationCatalog() {
  return catalogCards;
}

export function getImplementedProviderIds(): IntegrationProviderId[] {
  return providers.filter((p) => p.isImplemented).map((p) => p.id);
}
