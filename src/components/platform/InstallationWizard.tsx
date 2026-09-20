"use client";

import { useMemo, useState, useTransition } from "react";
import { MODULE_REGISTRY, type ModuleId } from "@/lib/modules/registry";
import type { InstallationTemplateRow } from "@/lib/platform/installations/types";
import {
  registerSimulatedInstallation,
  runInstallationDryRun,
  saveInstallationWizardDraft,
} from "@/app/actions/installations";
import { slugifyCompanyName } from "@/lib/installer/manifest";
import { Button } from "@/components/ui/Button";

const STEPS = [
  "Empresa",
  "Plantilla",
  "Logo",
  "Marca",
  "Módulos",
  "Proveedores",
  "Dominio",
  "Vista previa",
  "Instalar",
];

type WizardState = {
  companyName: string;
  templateId: string;
  logoUrl: string;
  primaryColor: string;
  fontFamily: string;
  modules: ModuleId[];
  primaryDomain: string;
  githubRepo: string;
  vercelProject: string;
  supabaseRef: string;
};

const defaultState: WizardState = {
  companyName: "",
  templateId: "ecommerce-store-v1",
  logoUrl: "",
  primaryColor: "#0860e8",
  fontFamily: "system-ui",
  modules: ["venta-online", "stock"],
  primaryDomain: "",
  githubRepo: "",
  vercelProject: "",
  supabaseRef: "",
};

export function InstallationWizard({
  templates,
  draftId: initialDraftId,
  initialStep = 1,
  initialPayload,
}: {
  templates: InstallationTemplateRow[];
  draftId?: string;
  initialStep?: number;
  initialPayload?: Record<string, unknown>;
}) {
  const [step, setStep] = useState(initialStep);
  const [draftId, setDraftId] = useState(initialDraftId ?? "");
  const [pending, startTransition] = useTransition();
  const [dryRunLog, setDryRunLog] = useState<string[]>([]);
  const [state, setState] = useState<WizardState>(() => ({
    ...defaultState,
    ...(initialPayload as Partial<WizardState>),
  }));

  const payload = useMemo(
    () => ({
      ...state,
      companySlug: slugifyCompanyName(state.companyName || "empresa"),
      githubSimulated: true,
      vercelSimulated: true,
      supabaseSimulated: true,
    }),
    [state]
  );

  const selectedTemplate = templates.find((t) => t.templateId === state.templateId);

  function persist(nextStep: number) {
    const fd = new FormData();
    if (draftId) fd.set("draft_id", draftId);
    fd.set("current_step", String(nextStep));
    fd.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      const res = await saveInstallationWizardDraft(fd);
      if (res.draftId) setDraftId(res.draftId);
      setStep(nextStep);
    });
  }

  function runDryRun() {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    if (draftId) fd.set("draft_id", draftId);
    startTransition(async () => {
      const res = await runInstallationDryRun(fd);
      if (res.result?.steps) {
        setDryRunLog(res.result.steps.map((s) => `${s.step}: ${s.message}`));
      }
    });
  }

  function finish() {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    if (draftId) fd.set("draft_id", draftId);
    startTransition(() => {
      void registerSimulatedInstallation(fd);
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ol className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, idx) => {
          const n = idx + 1;
          const active = n === step;
          return (
            <li
              key={label}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                active ? "bg-brand text-white" : "bg-surface-muted text-muted"
              }`}
            >
              {n}. {label}
            </li>
          );
        })}
      </ol>

      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Nombre de la empresa</h2>
            <input
              className="mt-4 w-full rounded-lg border border-border px-3 py-2"
              value={state.companyName}
              onChange={(e) => setState({ ...state, companyName: e.target.value })}
              placeholder="Ej. Acme Retail"
            />
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Plantilla</h2>
            <ul className="mt-4 space-y-2">
              {templates.map((t) => (
                <li key={t.templateId}>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand">
                    <input
                      type="radio"
                      name="template"
                      checked={state.templateId === t.templateId}
                      disabled={t.status === "coming_soon"}
                      onChange={() =>
                        setState({
                          ...state,
                          templateId: t.templateId,
                          modules: t.defaultModules as ModuleId[],
                        })
                      }
                    />
                    <span>
                      <span className="font-medium text-foreground">{t.name}</span>
                      <span className="mt-1 block text-sm text-text-secondary">{t.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Logo</h2>
            <p className="mt-2 text-sm text-text-secondary">URL pública o ruta en Storage del cliente (config, no código).</p>
            <input
              className="mt-4 w-full rounded-lg border border-border px-3 py-2"
              value={state.logoUrl}
              onChange={(e) => setState({ ...state, logoUrl: e.target.value })}
              placeholder="https://cdn.cliente.com/logo.png"
            />
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Colores y tipografía</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Color primario
                <input
                  type="color"
                  className="mt-1 h-10 w-full"
                  value={state.primaryColor}
                  onChange={(e) => setState({ ...state, primaryColor: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Tipografía
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  value={state.fontFamily}
                  onChange={(e) => setState({ ...state, fontFamily: e.target.value })}
                />
              </label>
            </div>
          </>
        )}
        {step === 5 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Módulos</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(Object.keys(MODULE_REGISTRY) as ModuleId[]).map((id) => (
                <label key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.modules.includes(id)}
                    onChange={(e) => {
                      setState({
                        ...state,
                        modules: e.target.checked
                          ? [...state.modules, id]
                          : state.modules.filter((m) => m !== id),
                      });
                    }}
                  />
                  {MODULE_REGISTRY[id].name}
                </label>
              ))}
            </div>
          </>
        )}
        {step === 6 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">GitHub · Vercel · Supabase</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Vinculación autorizada (OAuth futuro). En esta versión: metadatos simulados — sin tokens en servidor.
            </p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="GitHub org/repo"
                value={state.githubRepo}
                onChange={(e) => setState({ ...state, githubRepo: e.target.value })}
              />
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Proyecto Vercel"
                value={state.vercelProject}
                onChange={(e) => setState({ ...state, vercelProject: e.target.value })}
              />
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Supabase project ref"
                value={state.supabaseRef}
                onChange={(e) => setState({ ...state, supabaseRef: e.target.value })}
              />
            </div>
          </>
        )}
        {step === 7 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Dominio</h2>
            <input
              className="mt-4 w-full rounded-lg border border-border px-3 py-2"
              value={state.primaryDomain}
              onChange={(e) => setState({ ...state, primaryDomain: e.target.value })}
              placeholder="tienda.cliente.com"
            />
          </>
        )}
        {step === 8 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Vista previa</h2>
            <div
              className="mt-4 rounded-xl border border-border p-6"
              style={{ fontFamily: state.fontFamily, borderColor: state.primaryColor }}
            >
              {state.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.logoUrl} alt="" className="mb-4 h-12 object-contain" />
              ) : null}
              <p className="text-xl font-bold" style={{ color: state.primaryColor }}>
                {state.companyName || "Tu marca"}
              </p>
              <p className="text-sm text-text-secondary">{selectedTemplate?.name}</p>
              <p className="mt-2 text-xs text-muted">{state.modules.join(" · ")}</p>
            </div>
            <Button type="button" className="mt-4" variant="outline" onClick={runDryRun} disabled={pending}>
              Validar manifiesto (dry-run)
            </Button>
            {dryRunLog.length ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{dryRunLog.join("\n")}</pre>
            ) : null}
          </>
        )}
        {step === 9 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Verificación e instalación</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Modo <strong>simulación</strong>: registra la instancia en Control sin crear proyectos cloud reales.
              La app del cliente quedaría aislada cuando se ejecute el instalador real.
            </p>
            <Button type="button" className="mt-6" onClick={finish} disabled={pending || !state.companyName}>
              Registrar instalación (simulada)
            </Button>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step <= 1 || pending}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          Atrás
        </Button>
        {step < 9 ? (
          <Button type="button" disabled={pending} onClick={() => persist(step + 1)}>
            Guardar y continuar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
