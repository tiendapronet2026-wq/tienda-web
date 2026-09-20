"use client";

import { useMemo, useState, useTransition } from "react";
import { MODULE_REGISTRY, type ModuleId } from "@/lib/modules/registry";
import type { InstallationTemplateRow } from "@/lib/platform/installations/types";
import { TIENDAPRO_DEFAULT_BRANDING } from "@/lib/branding/types";
import { BrandingPreview } from "@/components/branding/BrandingPreview";
import {
  registerSimulatedInstallation,
  runInstallationDryRun,
  saveInstallationWizardDraft,
  verifyProviderConnections,
} from "@/app/actions/installations";
import { slugifyCompanyName } from "@/lib/installer/manifest";
import { TIENDAPRO_AUTHORIZED_LINK_TARGETS } from "@/lib/installer/providers/authorized";
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
  brandName: string;
  tagline: string;
  templateId: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  contactEmail: string;
  modules: ModuleId[];
  primaryDomain: string;
  githubRepo: string;
  vercelProject: string;
  supabaseRef: string;
  linksVerified: boolean;
};

const defaultState: WizardState = {
  companyName: "",
  brandName: "",
  tagline: "",
  templateId: "ecommerce-store-v1",
  logoUrl: "",
  faviconUrl: TIENDAPRO_DEFAULT_BRANDING.faviconUrl,
  primaryColor: TIENDAPRO_DEFAULT_BRANDING.primaryColor,
  secondaryColor: TIENDAPRO_DEFAULT_BRANDING.secondaryColor,
  fontFamily: TIENDAPRO_DEFAULT_BRANDING.fontFamily,
  contactEmail: "",
  modules: ["venta-online", "stock"],
  primaryDomain: "",
  githubRepo: "",
  vercelProject: "",
  supabaseRef: "",
  linksVerified: false,
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
  const [linkLog, setLinkLog] = useState<string[]>([]);
  const [tokenHints, setTokenHints] = useState<{ github: boolean; vercel: boolean; supabase: boolean } | null>(
    null
  );
  const [state, setState] = useState<WizardState>(() => ({
    ...defaultState,
    ...(initialPayload as Partial<WizardState>),
  }));

  const payload = useMemo(
    () => ({
      ...state,
      brandName: state.brandName || state.companyName,
      companySlug: slugifyCompanyName(state.companyName || "empresa"),
      githubSimulated: !state.linksVerified,
      vercelSimulated: !state.linksVerified,
      supabaseSimulated: !state.linksVerified,
      githubConnected: state.linksVerified && Boolean(state.githubRepo),
      vercelConnected: state.linksVerified && Boolean(state.vercelProject),
      supabaseConnected: state.linksVerified && Boolean(state.supabaseRef),
    }),
    [state]
  );

  const selectedTemplate = templates.find((t) => t.templateId === state.templateId);
  const previewPlatformMode = false;

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
    fd.set("payload", JSON.stringify({ ...payload, githubSimulated: true, vercelSimulated: true, supabaseSimulated: true }));
    if (draftId) fd.set("draft_id", draftId);
    startTransition(async () => {
      const res = await runInstallationDryRun(fd);
      if (res.result?.steps) {
        setDryRunLog(res.result.steps.map((s) => `${s.step}: ${s.message}`));
      }
    });
  }

  function verifyLinks() {
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    if (draftId) fd.set("draft_id", draftId);
    startTransition(async () => {
      const res = await verifyProviderConnections(fd);
      setTokenHints(res.tokensConfigured);
      if (res.steps) {
        setLinkLog(res.steps.map((s) => `${s.step}: ${s.message}`));
      }
      if (res.ok && res.verifiedCount > 0) {
        setState((s) => ({ ...s, linksVerified: true }));
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
      <div className="mb-6 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary">
        <p className="font-semibold text-foreground">Estado operativo</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Branding runtime</strong> — operativo en la tienda (referencia TiendaPro vía BD / env).
          </li>
          <li>
            <strong>Dry-run manifiesto</strong> — operativo (paso Vista previa).
          </li>
          <li>
            <strong>Verificar vínculos GitHub/Vercel/Supabase</strong> — operativo si hay tokens{" "}
            <code className="text-xs">INSTALLER_*</code> en el servidor; si no, informa omitido (no simula éxito).
          </li>
          <li>
            <strong>Instalación real (preview)</strong> — operativa desde ficha instalación tras grant + tokens{" "}
            <code className="text-xs">INSTALLER_*</code>.
          </li>
          <li>
            <strong>Creación de proyectos cloud nuevos</strong> — no operativa (mock / bloqueada).
          </li>
        </ul>
      </div>

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
            <label className="mt-4 block text-sm">
              Nombre comercial (opcional)
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={state.brandName}
                onChange={(e) => setState({ ...state, brandName: e.target.value })}
                placeholder={state.companyName || "Marca visible en la tienda"}
              />
            </label>
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
            <h2 className="text-lg font-semibold text-foreground">Logo y favicon</h2>
            <p className="mt-2 text-sm text-text-secondary">URL pública HTTPS o ruta estática del deploy.</p>
            <label className="mt-4 block text-sm">
              Logo
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={state.logoUrl}
                onChange={(e) => setState({ ...state, logoUrl: e.target.value })}
                placeholder="https://cdn.cliente.com/logo.png"
              />
            </label>
            <label className="mt-3 block text-sm">
              Favicon
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={state.faviconUrl}
                onChange={(e) => setState({ ...state, faviconUrl: e.target.value })}
                placeholder="/favicon.ico"
              />
            </label>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Colores, tipografía y contacto</h2>
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
                Color secundario
                <input
                  type="color"
                  className="mt-1 h-10 w-full"
                  value={state.secondaryColor}
                  onChange={(e) => setState({ ...state, secondaryColor: e.target.value })}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Tagline
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  value={state.tagline}
                  onChange={(e) => setState({ ...state, tagline: e.target.value })}
                  placeholder="Tienda online"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Tipografía (CSS)
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  value={state.fontFamily}
                  onChange={(e) => setState({ ...state, fontFamily: e.target.value })}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Email de contacto
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  value={state.contactEmail}
                  onChange={(e) => setState({ ...state, contactEmail: e.target.value })}
                  placeholder="hola@cliente.com"
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
              Vinculá recursos existentes. La verificación usa APIs oficiales con tokens solo en servidor. Para pruebas
              TiendaPro, usá los recursos autorizados indicados abajo.
            </p>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="GitHub org/repo"
                value={state.githubRepo}
                onChange={(e) => setState({ ...state, githubRepo: e.target.value, linksVerified: false })}
              />
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Proyecto Vercel"
                value={state.vercelProject}
                onChange={(e) => setState({ ...state, vercelProject: e.target.value, linksVerified: false })}
              />
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder="Supabase project ref"
                value={state.supabaseRef}
                onChange={(e) => setState({ ...state, supabaseRef: e.target.value, linksVerified: false })}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              Referencia TiendaPro: {TIENDAPRO_AUTHORIZED_LINK_TARGETS.githubRepo} · Vercel{" "}
              {TIENDAPRO_AUTHORIZED_LINK_TARGETS.vercelProject} · Supabase{" "}
              {TIENDAPRO_AUTHORIZED_LINK_TARGETS.supabaseProjectRef}
            </p>
            <Button type="button" className="mt-4" variant="outline" onClick={verifyLinks} disabled={pending}>
              Verificar vínculos (real)
            </Button>
            {tokenHints ? (
              <p className="mt-2 text-xs text-muted">
                Tokens servidor: GitHub {tokenHints.github ? "✓" : "—"} · Vercel {tokenHints.vercel ? "✓" : "—"} ·
                Supabase {tokenHints.supabase ? "✓" : "—"}
              </p>
            ) : null}
            {linkLog.length ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{linkLog.join("\n")}</pre>
            ) : null}
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
            <p className="mt-2 text-xs text-muted">El DNS no se modifica desde Control hasta habilitar instalación real.</p>
          </>
        )}
        {step === 8 && (
          <>
            <h2 className="text-lg font-semibold text-foreground">Vista previa</h2>
            <div className="mt-4">
              <BrandingPreview
                input={{
                  companyName: state.companyName,
                  brandName: state.brandName || state.companyName,
                  tagline: state.tagline,
                  logoUrl: state.logoUrl,
                  faviconUrl: state.faviconUrl,
                  primaryColor: state.primaryColor,
                  secondaryColor: state.secondaryColor,
                  fontFamily: state.fontFamily,
                  contactEmail: state.contactEmail,
                }}
                platformMode={previewPlatformMode}
              />
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              Plantilla: {selectedTemplate?.name} · {state.modules.join(" · ")}
            </p>
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
            <h2 className="text-lg font-semibold text-foreground">Registro e instalación real</h2>
            <p className="mt-2 text-sm text-text-secondary">
              <strong>Operativo:</strong> registrar borrador en Control y, desde la ficha de la instalación,
              autorizar grant + ejecutar instalación real en preview (rama Git + env Vercel).
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              <strong>No operativo aquí:</strong> creación de proyectos cloud nuevos (Etapa posterior).
            </p>
            <Button type="button" className="mt-6" onClick={finish} disabled={pending || !state.companyName}>
              Registrar en Control (continuar en ficha)
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
