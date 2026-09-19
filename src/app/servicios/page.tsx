import { SectionHeader } from "@/components/platform/SectionHeader";
import { ServiceCard } from "@/components/platform/ServiceCard";
import { platformServices } from "@/lib/platform/services";

export const metadata = {
  title: "Servicios digitales",
  description: "Desarrollo web, tiendas online, gestión, POS, chatbots y automatizaciones.",
};

export default function ServiciosPage() {
  return (
    <div className="tp-container py-12 sm:py-16">
      <SectionHeader
        eyebrow="Servicios digitales"
        title="Qué construimos con TiendaPro"
        description="Seis líneas de servicio alineadas a la plataforma 3.0. Detalle, alcance y enlace a demos cuando aplica."
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {platformServices.map((s) => (
          <ServiceCard key={s.slug} service={s} />
        ))}
      </div>
    </div>
  );
}
