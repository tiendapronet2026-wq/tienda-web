"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitQuoteRequest } from "@/app/actions/quotes";
import { Button } from "@/components/ui/Button";
import { MAIN_SERVICES, type ServiceSlug } from "@/lib/services";
import { MAX_QUOTE_FILES, formatFileSize } from "@/lib/quotes";

const serviceOptions: { value: ServiceSlug; label: string }[] = [
  ...MAIN_SERVICES.map((service) => ({ value: service.slug, label: service.title })),
  { value: "personalizado", label: "Trabajo personalizado / No estoy seguro" },
];

export function QuoteForm({
  initialService = "personalizado",
  prefill,
}: {
  initialService?: ServiceSlug;
  prefill?: {
    customerName?: string;
    email?: string;
    phone?: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [service, setService] = useState<ServiceSlug>(initialService);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);

  const hints = useMemo(() => {
    if (service === "impresion-papel") {
      return "Podés indicar tamaño, color/B&N, simple o doble faz y tipo de papel si lo conocés.";
    }
    if (service === "impresion-3d") {
      return "Si tenés archivo STL u OBJ, adjuntarlo ayuda mucho. También sirven fotos de referencia.";
    }
    if (service === "grabado-laser") {
      return "Indicá material, área a grabar y si hay texto o diseño.";
    }
    if (service === "corte-polifan") {
      return "Contanos alto, ancho, espesor si lo sabés y si son letras, figuras o un logo.";
    }
    return "Describí tu idea con la mayor claridad posible. No hace falta conocer todos los detalles técnicos.";
  }, [service]);

  function onFilesChange(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).slice(0, MAX_QUOTE_FILES);
    setFiles(next);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.delete("attachments");
    for (const file of files) {
      formData.append("attachments", file);
    }

    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await submitQuoteRequest(formData);
      if ("error" in result) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push(`/cotizacion/confirmacion?codigo=${encodeURIComponent(result.quoteNumber)}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">1. Servicio</h2>
        <p className="mt-1 text-sm text-text-secondary">Elegí la técnica o dejá que te orientemos.</p>
        <label className="mt-4 block text-sm font-medium text-foreground">
          Servicio
          <select
            name="service_type"
            value={service}
            onChange={(event) => setService(event.target.value as ServiceSlug)}
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
            required
          >
            {serviceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {fieldErrors.service_type && <FieldError message={fieldErrors.service_type} />}
        <p className="mt-3 text-sm text-text-secondary">{hints}</p>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">2. Datos de contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Nombre completo"
            name="customer_name"
            defaultValue={prefill?.customerName}
            required
            error={fieldErrors.customer_name}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={prefill?.email}
            required
            error={fieldErrors.email}
          />
          <Field
            label="Teléfono o WhatsApp (opcional)"
            name="phone"
            defaultValue={prefill?.phone ?? undefined}
            error={fieldErrors.phone}
          />
          <Field label="Empresa (opcional)" name="company_name" error={fieldErrors.company_name} />
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">3. Detalles del proyecto</h2>
        <p className="mt-1 text-sm text-text-secondary">
          No te preocupes si no conocés todos los datos. Describinos tu idea y te ayudaremos a
          definirlos.
        </p>
        <label className="mt-4 block text-sm font-medium text-foreground">
          Descripción del proyecto
          <textarea
            name="description"
            rows={5}
            required
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
            placeholder="Contanos qué necesitás producir, para qué se usa y cualquier detalle importante."
          />
        </label>
        {fieldErrors.description && <FieldError message={fieldErrors.description} />}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(service === "impresion-papel" || service === "personalizado") && (
            <>
              <SelectField
                label="Color o blanco y negro"
                name="print_color_mode"
                error={fieldErrors.print_color_mode}
                options={[
                  { value: "", label: "Sin especificar" },
                  { value: "color", label: "Color" },
                  { value: "bn", label: "Blanco y negro" },
                ]}
              />
              <SelectField
                label="Simple o doble faz"
                name="print_sides"
                error={fieldErrors.print_sides}
                options={[
                  { value: "", label: "Sin especificar" },
                  { value: "simple", label: "Simple faz" },
                  { value: "doble", label: "Doble faz" },
                ]}
              />
              <Field label="Tipo de papel (si lo conocés)" name="paper_type" error={fieldErrors.paper_type} />
              <Field label="Terminación" name="finish" error={fieldErrors.finish} />
            </>
          )}

          {service === "impresion-3d" && (
            <>
              <Field label="Color deseado" name="color" error={fieldErrors.color} />
              <SelectField
                label="Nivel de detalle"
                name="detail_level"
                error={fieldErrors.detail_level}
                options={[
                  { value: "", label: "Sin especificar" },
                  { value: "basico", label: "Básico" },
                  { value: "medio", label: "Medio" },
                  { value: "alto", label: "Alto" },
                ]}
              />
              <Field label="Terminación" name="finish" error={fieldErrors.finish} />
              <Field label="Material (si lo conocés)" name="material" error={fieldErrors.material} />
            </>
          )}

          {service === "grabado-laser" && (
            <>
              <Field label="Material" name="material" error={fieldErrors.material} />
              <Field label="Área a grabar" name="engraving_area" error={fieldErrors.engraving_area} />
              <div className="sm:col-span-2">
                <Field label="Texto o diseño" name="design_text" error={fieldErrors.design_text} />
              </div>
            </>
          )}

          {service === "corte-polifan" && (
            <>
              <Field
                label="Tipo de figura / letras / logo"
                name="figure_type"
                error={fieldErrors.figure_type}
              />
              <Field label="Terminación deseada" name="finish" error={fieldErrors.finish} />
              <Field label="Material / color (si aplica)" name="material" error={fieldErrors.material} />
            </>
          )}
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">4. Medidas y cantidad</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cantidad" name="quantity" type="number" min="1" error={fieldErrors.quantity} />
          <Field
            label={service === "impresion-papel" ? "Ancho / tamaño (mm)" : "Ancho (mm)"}
            name="width_mm"
            type="number"
            step="0.01"
            min="0"
            error={fieldErrors.width_mm}
          />
          <Field
            label="Alto (mm)"
            name="height_mm"
            type="number"
            step="0.01"
            min="0"
            error={fieldErrors.height_mm}
          />
          {(service === "impresion-3d" || service === "corte-polifan" || service === "personalizado") && (
            <Field
              label={service === "corte-polifan" ? "Espesor (mm)" : "Profundidad (mm)"}
              name="depth_mm"
              type="number"
              step="0.01"
              min="0"
              error={fieldErrors.depth_mm}
            />
          )}
          <Field label="Fecha deseada (opcional)" name="deadline_date" type="date" error={fieldErrors.deadline_date} />
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">5. Archivos</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Formatos: PNG, JPG, WEBP, PDF, SVG, STL, OBJ, ZIP. Máximo {MAX_QUOTE_FILES} archivos · 15 MB c/u.
        </p>
        <input
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.pdf,.svg,.stl,.obj,.zip"
          onChange={(event) => onFilesChange(event.target.files)}
          className="mt-4 block w-full text-sm text-text-secondary file:mr-3 file:rounded-[var(--radius-md)] file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
        />
        {files.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-text-secondary">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                {file.name} · {formatFileSize(file.size)}
              </li>
            ))}
          </ul>
        )}
        {fieldErrors.attachments && <FieldError message={fieldErrors.attachments} />}
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">6. Confirmación</h2>
        <label className="mt-4 flex items-start gap-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            name="privacy_accepted"
            value="on"
            className="mt-1 h-4 w-4 rounded border-border"
            required
          />
          <span>
            Acepto que TiendaPro use estos datos únicamente para responder mi solicitud de
            cotización.
          </span>
        </label>
        {fieldErrors.privacy_accepted && <FieldError message={fieldErrors.privacy_accepted} />}

        {error && (
          <p className="mt-4 rounded-[var(--radius-md)] bg-error-soft px-4 py-3 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6">
          <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Enviando solicitud..." : "Enviar solicitud de cotización"}
          </Button>
        </div>
      </section>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  error,
  min,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
        className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
      />
      {error && <FieldError message={error} />}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  error,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <select
        name={name}
        className="mt-1.5 w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
      >
        {options.map((option) => (
          <option key={option.value || "empty"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <FieldError message={error} />}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="mt-1 block text-xs font-medium text-error">{message}</span>;
}
