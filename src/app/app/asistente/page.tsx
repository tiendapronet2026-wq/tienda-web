import Link from "next/link";
import { PageTitle } from "@/components/platform/PageTitle";

export default function AppAsistentePage() {
  return (
    <>
      <PageTitle title="Asistente" description="Módulo chatbot — reglas locales, sin APIs externas." />
      <p className="text-sm text-text-secondary">
        Operaciones sensibles requieren permisos y aprobación humana (fase posterior).
      </p>
      <Link href="/demos/chatbot" className="mt-4 inline-flex text-sm font-semibold text-brand">
        Probar en showroom →
      </Link>
    </>
  );
}
