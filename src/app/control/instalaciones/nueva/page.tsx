import { PageTitle } from "@/components/platform/PageTitle";
import { InstallationWizard } from "@/components/platform/InstallationWizard";
import {
  loadInstallationTemplates,
  loadOpenWizardDraftForUser,
} from "@/lib/platform/installations/loader";
import Link from "next/link";

export default async function NuevaInstalacionPage() {
  const { templates } = await loadInstallationTemplates();
  const draft = await loadOpenWizardDraftForUser();

  return (
    <>
      <Link href="/control/instalaciones" className="text-sm font-semibold text-brand hover:underline">
        ← Instalaciones
      </Link>
      <PageTitle
        title="Asistente de nueva instalación"
        description="Personalizá marca, módulos y recursos. Guardá borrador en cualquier paso. La instalación cloud real requiere cuentas autorizadas; por ahora dry-run y registro simulado."
      />
      <InstallationWizard
        templates={templates}
        draftId={draft?.id}
        initialStep={draft?.current_step ?? 1}
        initialPayload={(draft?.payload as Record<string, unknown>) ?? undefined}
      />
    </>
  );
}
