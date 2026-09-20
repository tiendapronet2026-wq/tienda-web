export type ServiceSlug =
  | "desarrollo-web"
  | "tiendas-online"
  | "sistemas-gestion"
  | "caja-pos"
  | "chatbots"
  | "automatizaciones";

export type PlatformService = {
  slug: ServiceSlug;
  title: string;
  shortDescription: string;
  description: string;
  highlights: string[];
  accent: "brand" | "secondary" | "accent";
};

export const platformServices: PlatformService[] = [
  {
    slug: "desarrollo-web",
    title: "Desarrollo web",
    shortDescription: "Sitios rápidos, accesibles y alineados a tu marca.",
    description:
      "Diseñamos y desarrollamos experiencias web premium con enfoque mobile-first, rendimiento y mantenibilidad.",
    highlights: ["Landing y sitios corporativos", "Design system reutilizable", "Integración con panel TiendaPro"],
    accent: "brand",
  },
  {
    slug: "tiendas-online",
    title: "Tiendas online",
    shortDescription: "E-commerce modular listo para escalar.",
    description:
      "Catálogo, checkout y operaciones conectadas a tu centro de gestión de clientes y proyectos.",
    highlights: ["Checkout optimizado", "Multi-canal", "Showroom de demos incluido"],
    accent: "secondary",
  },
  {
    slug: "sistemas-gestion",
    title: "Sistemas de gestión",
    shortDescription: "Operaciones, inventario y equipos en un solo lugar.",
    description:
      "Paneles privados a medida con permisos, informes y trazabilidad para cada cliente o unidad de negocio.",
    highlights: ["Roles y permisos", "Informes exportables", "Base multi-proyecto"],
    accent: "accent",
  },
  {
    slug: "caja-pos",
    title: "Sistemas de caja y POS",
    shortDescription: "Punto de venta ágil para retail y servicios.",
    description:
      "Cobros, tickets y sincronización con backoffice. Demos interactivas con datos ficticios.",
    highlights: ["POS táctil", "Cierre de caja", "Mock listo para iterar"],
    accent: "brand",
  },
  {
    slug: "chatbots",
    title: "Chatbots",
    shortDescription: "Asistentes con reglas, no acciones ciegas.",
    description:
      "Arquitectura interpretación → validación → reglas → herramientas → auditoría, sin integraciones externas hasta autorización.",
    highlights: ["Flujos guiados", "Centro de agentes", "Sin WhatsApp/IG por defecto"],
    accent: "secondary",
  },
  {
    slug: "automatizaciones",
    title: "Automatizaciones",
    shortDescription: "Flujos que ahorran tiempo sin perder control.",
    description:
      "Conectamos procesos internos, alertas e informes para equipos comerciales y operativos.",
    highlights: ["Triggers y reglas", "Informes programados", "Extensible por proyecto"],
    accent: "accent",
  },
];

export function getServiceBySlug(slug: string): PlatformService | undefined {
  return platformServices.find((s) => s.slug === slug);
}
