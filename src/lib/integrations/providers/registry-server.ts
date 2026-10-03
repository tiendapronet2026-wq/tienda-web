import { linkDemoProvider } from "@/lib/integrations/providers/link-demo";
import { mercadoPagoProvider } from "@/lib/integrations/providers/mercadopago";
import type { IntegrationProvider, IntegrationProviderId } from "@/lib/integrations/providers/types";

const providers: IntegrationProvider[] = [linkDemoProvider, mercadoPagoProvider];

export function getIntegrationProvider(id: string): IntegrationProvider | null {
  return providers.find((p) => p.id === id) ?? null;
}

export function getImplementedProviderIds(): IntegrationProviderId[] {
  return providers.filter((p) => p.isImplemented).map((p) => p.id);
}
