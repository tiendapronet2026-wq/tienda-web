export type DemoSlug = "tienda" | "pos" | "chatbot" | "dashboard";

export type DemoDefinition = {
  slug: DemoSlug;
  title: string;
  description: string;
  service: string;
  disclaimer: string;
};

export const demos: DemoDefinition[] = [
  {
    slug: "tienda",
    title: "Tienda online demo",
    description: "Catálogo ficticio con filtros y detalle de producto.",
    service: "Tiendas online",
    disclaimer: "Productos y precios inventados. No se procesan pagos reales.",
  },
  {
    slug: "pos",
    title: "Caja POS demo",
    description: "Agregá ítems mock y simulá un ticket de venta.",
    service: "Caja y POS",
    disclaimer: "Totales de ejemplo. Sin conexión a cajas ni AFIP.",
  },
  {
    slug: "chatbot",
    title: "Chatbot con reglas",
    description: "Probá respuestas guiadas por motor de reglas local.",
    service: "Chatbots",
    disclaimer: "Sin LLM externo ni WhatsApp. Respuestas predefinidas.",
  },
  {
    slug: "dashboard",
    title: "Panel de gestión",
    description: "Métricas y listados con datos ficticios.",
    service: "Sistemas de gestión",
    disclaimer: "KPIs simulados para demostración comercial.",
  },
];

export function getDemo(slug: string): DemoDefinition | undefined {
  return demos.find((d) => d.slug === slug);
}

export const mockStoreProducts = [
  { id: "1", name: "Plan Starter (demo)", price: 19900, category: "Suscripciones" },
  { id: "2", name: "Pack diseño UI (demo)", price: 45000, category: "Servicios" },
  { id: "3", name: "Integración POS (demo)", price: 78000, category: "Hardware" },
  { id: "4", name: "Automatización informes (demo)", price: 32000, category: "Servicios" },
];
