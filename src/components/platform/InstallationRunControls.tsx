"use client";

import { useState, useTransition } from "react";
import {
  createInstallationResourceGrant,
  runExistingResourcesInstallation,
} from "@/app/actions/installations";
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";
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
  const [githubRepo, setGithubRepo] = useState("");
  const [vercelProject, setVercelProject] = useState("");
  const [supabaseRef, setSupabaseRef] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  function authorize() {
    const fd = new FormData();
    fd.set("installation_id", installationId);
    fd.set("deploy_branch", `install/${companySlug}`);
    fd.set("github_repo", githubRepo);
    fd.set("vercel_project", vercelProject);
    fd.set("supabase_ref", supabaseRef);
    startTransition(async () => {
      const res = await createInstallationResourceGrant(fd);
      setMessage(
        res.ok
          ? `Grant registrado (${res.resourceTier === "platform_test" ? "prueba TiendaPro → máx. preview_validated" : "cliente → puede live"})`
          : res.error ?? "Error"
      );
    });
  }

  function runInstall(resume: boolean) {
    const fd = new FormData();
    fd.set("installation_id", installationId);
    if (resume) fd.set("resume", "1");
    if (anonKey) fd.set("client_supabase_anon_key", anonKey);
    if (siteUrl) fd.set("client_site_url", siteUrl);
    startTransition(async () => {
      const res = await runExistingResourcesInstallation(fd);
      if (res.result?.steps) {
        setLog(res.result.steps.map((s) => `${s.step}: [${s.status}] ${s.message}`));
      }
      const outcome = res.outcome;
      setMessage(
        outcome
          ? `${outcome.summary} (estado: ${outcome.lifecycleStatus})`
          : res.error ?? "Instalación no completada"
      );
    });
  }

  if (!canRun) return null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-foreground">Instalador — recursos del cliente</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Completá los IDs autorizados para esta empresa. Si coinciden con infra TiendaPro (
        {TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo}, {TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject},{" "}
        {TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef}), solo se validará{" "}
        <strong>preview_validated</strong>, nunca live independiente.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
          placeholder="GitHub org/repo (cliente)"
          value={githubRepo}
          onChange={(e) => setGithubRepo(e.target.value)}
        />
        <input
          className="rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Proyecto Vercel (cliente)"
          value={vercelProject}
          onChange={(e) => setVercelProject(e.target.value)}
        />
        <input
          className="rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Supabase project ref (cliente)"
          value={supabaseRef}
          onChange={(e) => setSupabaseRef(e.target.value)}
        />
        <input
          className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
          placeholder="NEXT_PUBLIC_SUPABASE_ANON_KEY (solo servidor → Vercel, no se guarda en BD)"
          value={anonKey}
          onChange={(e) => setAnonKey(e.target.value)}
        />
        <input
          className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
          placeholder="NEXT_PUBLIC_SITE_URL del cliente (opcional)"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={authorize}>
          1. Autorizar grant
        </Button>
        <Button type="button" disabled={pending} onClick={() => runInstall(false)}>
          2. Ejecutar instalación
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => runInstall(true)}>
          Reanudar pasos OK
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-foreground">{message}</p> : null}
      {log.length ? (
        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{log.join("\n")}</pre>
      ) : null}
    </section>
  );
}
