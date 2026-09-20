"use client";

import { useState, useTransition } from "react";
import {
  createInstallationResourceGrant,
  runExistingResourcesInstallation,
} from "@/app/actions/installations";
import { Button } from "@/components/ui/Button";

export function InstallationRunControls({
  installationId,
  companySlug,
  canRun,
}: {
  installationId: string;
  companySlug: string;
  canRun: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [log, setLog] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function authorize() {
    const fd = new FormData();
    fd.set("installation_id", installationId);
    fd.set("deploy_branch", `install/${companySlug}`);
    startTransition(async () => {
      const res = await createInstallationResourceGrant(fd);
      setMessage(res.ok ? `Grant preview creado (${res.deployBranch})` : res.error ?? "Error");
    });
  }

  function runInstall(payloadJson?: string) {
    const fd = new FormData();
    fd.set("installation_id", installationId);
    if (payloadJson) fd.set("payload", payloadJson);
    startTransition(async () => {
      const res = await runExistingResourcesInstallation(fd);
      if (res.result?.steps) {
        setLog(res.result.steps.map((s) => `${s.step}: [${s.status}] ${s.message}`));
      }
      setMessage(
        res.complete
          ? `Instalación live en preview${res.result?.deploymentUrl ? `: ${res.result.deploymentUrl}` : ""}`
          : res.error ?? "Instalación no completada"
      );
    });
  }

  if (!canRun) return null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-foreground">Instalador real (recursos existentes)</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Preview aislado por rama Git y variables en Vercel. No modifica producción www.tiendapro.net sin grant
        production.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={authorize}>
          1. Autorizar recursos (grant)
        </Button>
        <Button type="button" disabled={pending} onClick={() => runInstall()}>
          2. Ejecutar instalación real
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-foreground">{message}</p> : null}
      {log.length ? (
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{log.join("\n")}</pre>
      ) : null}
    </section>
  );
}
