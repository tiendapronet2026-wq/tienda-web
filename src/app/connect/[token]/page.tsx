import { notFound } from "next/navigation";
import { resolveLinkSessionForConnect } from "@/lib/integrations/integration-service";
import { ConnectConfirmForm } from "@/components/integrations/ConnectConfirmForm";

export default async function ConnectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const resolved = await resolveLinkSessionForConnect(token);
  if (!resolved.valid) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <h1 className="text-xl font-semibold">Enlace no válido</h1>
        <p className="mt-2 text-sm text-muted">
          {resolved.reason === "expired"
            ? "Este enlace expiró. Generá uno nuevo desde Integraciones en la PC."
            : resolved.reason === "used"
              ? "Este enlace ya fue utilizado."
              : "El enlace no es válido o fue cancelado."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <ConnectConfirmForm
        token={token}
        providerId={resolved.provider}
        providerLabel={resolved.providerLabel}
        requesterLabel={resolved.requesterLabel}
        expiresAt={resolved.expiresAt}
      />
    </div>
  );
}
