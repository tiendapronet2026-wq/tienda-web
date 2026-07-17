export type ServiceSlug =
  | "impresion-papel"
  | "impresion-3d"
  | "grabado-laser"
  | "corte-polifan"
  | "personalizado";

export type ServiceDefinition = {
  slug: Exclude<ServiceSlug, "personalizado">;
  title: string;
  shortTitle: string;
  description: string;
  examples: string[];
  needed: string[];
  process: string[];
  faqs: { q: string; a: string }[];
  iconBg: string;
};

export const SERVICE_SLUGS = [
  "impresion-papel",
  "impresion-3d",
  "grabado-laser",
  "corte-polifan",
  "personalizado",
] as const;

export const MAIN_SERVICES: ServiceDefinition[] = [
  {
    slug: "impresion-papel",
    title: "Impresiones en papel",
    shortTitle: "Impresión en papel",
    description:
      "Impresiones para trabajos, eventos, material comercial y proyectos personalizados.",
    examples: [
      "Folletos y flyers",
      "Afiches y cartelería",
      "Material para eventos",
      "Documentación comercial",
    ],
    needed: [
      "Tamaño",
      "Cantidad",
      "Color o blanco y negro",
      "Simple o doble faz",
      "Tipo de papel, si lo conoce",
      "Terminación",
      "Archivo para imprimir",
    ],
    process: [
      "Nos contás qué necesitás imprimir",
      "Revisamos el archivo y los detalles",
      "Preparamos una cotización personalizada",
      "Coordinamos la producción del trabajo",
    ],
    faqs: [
      {
        q: "¿Necesito tener el archivo listo?",
        a: "Idealmente sí, pero también podés enviarnos una referencia y te ayudamos a definir el formato.",
      },
      {
        q: "¿Puedo pedir pocas unidades?",
        a: "Sí. Indicá la cantidad aproximada y evaluamos la mejor opción para tu proyecto.",
      },
    ],
    iconBg: "bg-brand-soft text-brand",
  },
  {
    slug: "impresion-3d",
    title: "Impresión 3D",
    shortTitle: "Impresión 3D",
    description: "Piezas, prototipos, llaveros, accesorios y diseños personalizados.",
    examples: [
      "Prototipos y piezas funcionales",
      "Llaveros y accesorios",
      "Figuras personalizadas",
      "Repuestos o soportes a medida",
    ],
    needed: [
      "Medidas aproximadas",
      "Cantidad",
      "Uso de la pieza",
      "Color deseado",
      "Archivo STL, OBJ o imagen de referencia",
      "Nivel de detalle",
      "Necesidad de terminación",
    ],
    process: [
      "Compartís la idea o el archivo 3D",
      "Revisamos viabilidad y detalles",
      "Preparamos la cotización",
      "Producimos la pieza acordada",
    ],
    faqs: [
      {
        q: "¿Qué pasa si no tengo un archivo STL?",
        a: "Podés adjuntar fotos o bocetos. Te ayudamos a evaluar si se puede producir.",
      },
      {
        q: "¿Puedo pedir una sola unidad?",
        a: "Sí. Indicá la cantidad que necesitás, aunque sea una pieza.",
      },
    ],
    iconBg: "bg-brand-secondary-soft text-brand-secondary",
  },
  {
    slug: "grabado-laser",
    title: "Grabado láser",
    shortTitle: "Grabado láser",
    description: "Grabados precisos para regalos, productos, señalética y piezas personalizadas.",
    examples: [
      "Regalos personalizados",
      "Señalética y carteles",
      "Marcado de productos",
      "Diseños sobre madera u otros materiales",
    ],
    needed: [
      "Material",
      "Medidas",
      "Cantidad",
      "Área a grabar",
      "Texto o diseño",
      "Imagen vectorial o referencia",
    ],
    process: [
      "Indicás el material y el diseño",
      "Revisamos el área de grabado",
      "Cotizamos el trabajo",
      "Realizamos el grabado con precisión",
    ],
    faqs: [
      {
        q: "¿Puedo grabar un logo?",
        a: "Sí. Adjuntá una imagen o archivo de referencia lo más nítido posible.",
      },
      {
        q: "¿Debo traer el material?",
        a: "Podés consultar ambas opciones. Indicá el material en la solicitud y lo evaluamos.",
      },
    ],
    iconBg: "bg-brand-accent-soft text-brand-accent",
  },
  {
    slug: "corte-polifan",
    title: "Corte de polifan",
    shortTitle: "Corte de polifan",
    description: "Formas, letras y elementos decorativos cortados con precisión.",
    examples: [
      "Letras y nombres",
      "Figuras decorativas",
      "Logotipos recortados",
      "Elementos para eventos o vidrieras",
    ],
    needed: [
      "Alto",
      "Ancho",
      "Espesor, si lo conoce",
      "Cantidad",
      "Letras, nombres, figuras o logotipos",
      "Diseño o imagen de referencia",
      "Terminación deseada",
    ],
    process: [
      "Nos contás la forma o el texto a cortar",
      "Confirmamos medidas y espesor",
      "Preparamos la cotización",
      "Cortamos y entregamos el resultado",
    ],
    faqs: [
      {
        q: "¿Puedo pedir letras sueltas?",
        a: "Sí. Indicá el texto, el alto aproximado y la cantidad de juegos que necesitás.",
      },
      {
        q: "¿Necesito un diseño profesional?",
        a: "No necesariamente. Una referencia clara nos ayuda a orientarte.",
      },
    ],
    iconBg: "bg-surface-muted text-brand-secondary",
  },
];

export function getServiceBySlug(slug: string): ServiceDefinition | undefined {
  return MAIN_SERVICES.find((service) => service.slug === slug);
}

export function isServiceSlug(value: string): value is ServiceSlug {
  return (SERVICE_SLUGS as readonly string[]).includes(value);
}

export function serviceLabel(slug: ServiceSlug | string): string {
  if (slug === "personalizado") return "Trabajo personalizado";
  return getServiceBySlug(slug)?.title ?? slug;
}

export const SERVICE_ICONS: Record<Exclude<ServiceSlug, "personalizado">, string> = {
  "impresion-papel": "M7 4h10v5H7zM5 9h14v7H5zM8 16h8v4H8zM9 12h6",
  "impresion-3d": "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5",
  "grabado-laser": "M4 18h16M7 18l5-12 5 12M9.5 12h5",
  "corte-polifan": "M4 6l8-2 8 2v4l-8 2-8-2V6zm0 8l8 2 8-2v4l-8 2-8-2v-4z",
};
