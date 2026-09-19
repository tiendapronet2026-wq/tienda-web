import { PageTitle } from "@/components/platform/PageTitle";

export default function ControlDesplieguesPage() {
  return (
    <>
      <PageTitle
        title="Despliegues"
        description="Modos shared / dedicated y dominios custom — diseño preparado, sin aprovisionamiento automático."
      />
      <ul className="mt-4 space-y-2 text-sm text-text-secondary">
        <li>Vercel · proyecto tienda-web · previews en PR</li>
        <li>Producción · merge master · requiere autorización</li>
        <li>Supabase · ref lwenyboejvwuopsenrwx · SQL remoto pendiente</li>
      </ul>
    </>
  );
}
