"use server";

import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { isServiceSlug } from "@/lib/services";
import {
  ALLOWED_QUOTE_EXTENSIONS,
  ALLOWED_QUOTE_MIME_TYPES,
  MAX_QUOTE_FILE_BYTES,
  MAX_QUOTE_FILES,
  MAX_QUOTE_TOTAL_BYTES,
  getExtension,
  hasSuspiciousExtension,
  sanitizeFilename,
} from "@/lib/quotes";

export type SubmitQuoteResult =
  | { success: true; quoteNumber: string; quoteId: string }
  | { error: string; fieldErrors?: Record<string, string> };

function trim(value: FormDataEntryValue | null, max = 5000): string {
  return String(value ?? "").trim().slice(0, max);
}

function optionalTrim(value: FormDataEntryValue | null, max = 500): string | null {
  const text = trim(value, max);
  return text || null;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const text = trim(value, 20);
  if (!text) return null;
  const num = Number(text);
  if (!Number.isInteger(num) || num <= 0 || num > 100000) return NaN;
  return num;
}

function parseOptionalMeasure(value: FormDataEntryValue | null): number | null {
  const text = trim(value, 20).replace(",", ".");
  if (!text) return null;
  const num = Number(text);
  if (!Number.isFinite(num) || num <= 0 || num > 100000) return NaN;
  return Math.round(num * 100) / 100;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function collectFiles(formData: FormData): File[] {
  const files = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  return files.slice(0, MAX_QUOTE_FILES + 1);
}

export async function submitQuoteRequest(formData: FormData): Promise<SubmitQuoteResult> {
  // Honeypot
  if (trim(formData.get("website"), 200)) {
    return { error: "No se pudo enviar la solicitud." };
  }

  const allowedKeys = new Set([
    "website",
    "service_type",
    "customer_name",
    "email",
    "phone",
    "company_name",
    "description",
    "quantity",
    "width_mm",
    "height_mm",
    "depth_mm",
    "material",
    "color",
    "deadline_date",
    "print_color_mode",
    "print_sides",
    "paper_type",
    "finish",
    "detail_level",
    "engraving_area",
    "design_text",
    "figure_type",
    "privacy_accepted",
    "attachments",
  ]);

  for (const key of formData.keys()) {
    if (!allowedKeys.has(key)) {
      return { error: "La solicitud contiene campos no permitidos." };
    }
  }

  const fieldErrors: Record<string, string> = {};
  const serviceType = trim(formData.get("service_type"), 40);
  const customerName = trim(formData.get("customer_name"), 120);
  const email = trim(formData.get("email"), 254).toLowerCase();
  const phone = optionalTrim(formData.get("phone"), 40);
  const companyName = optionalTrim(formData.get("company_name"), 160);
  const description = trim(formData.get("description"), 5000);
  const quantity = parseOptionalInt(formData.get("quantity"));
  const widthMm = parseOptionalMeasure(formData.get("width_mm"));
  const heightMm = parseOptionalMeasure(formData.get("height_mm"));
  const depthMm = parseOptionalMeasure(formData.get("depth_mm"));
  const material = optionalTrim(formData.get("material"), 160);
  const color = optionalTrim(formData.get("color"), 120);
  const deadlineDate = optionalTrim(formData.get("deadline_date"), 20);
  const printColorMode = optionalTrim(formData.get("print_color_mode"), 20);
  const printSides = optionalTrim(formData.get("print_sides"), 20);
  const paperType = optionalTrim(formData.get("paper_type"), 120);
  const finish = optionalTrim(formData.get("finish"), 160);
  const detailLevel = optionalTrim(formData.get("detail_level"), 20);
  const engravingArea = optionalTrim(formData.get("engraving_area"), 240);
  const designText = optionalTrim(formData.get("design_text"), 2000);
  const figureType = optionalTrim(formData.get("figure_type"), 160);
  const privacyAccepted = formData.get("privacy_accepted") === "on" || formData.get("privacy_accepted") === "true";

  if (!isServiceSlug(serviceType)) fieldErrors.service_type = "Seleccioná un servicio válido.";
  if (customerName.length < 2) fieldErrors.customer_name = "Ingresá tu nombre completo.";
  if (!isValidEmail(email)) fieldErrors.email = "Ingresá un email válido.";
  if (description.length < 10) fieldErrors.description = "Contanos un poco más sobre tu proyecto.";
  if (Number.isNaN(quantity)) fieldErrors.quantity = "La cantidad debe ser un número entero positivo.";
  if (Number.isNaN(widthMm)) fieldErrors.width_mm = "Ingresá una medida válida.";
  if (Number.isNaN(heightMm)) fieldErrors.height_mm = "Ingresá una medida válida.";
  if (Number.isNaN(depthMm)) fieldErrors.depth_mm = "Ingresá una medida válida.";
  if (printColorMode && !["color", "bn"].includes(printColorMode)) {
    fieldErrors.print_color_mode = "Opción de color inválida.";
  }
  if (printSides && !["simple", "doble"].includes(printSides)) {
    fieldErrors.print_sides = "Opción de faz inválida.";
  }
  if (detailLevel && !["basico", "medio", "alto"].includes(detailLevel)) {
    fieldErrors.detail_level = "Nivel de detalle inválido.";
  }
  if (deadlineDate && Number.isNaN(Date.parse(deadlineDate))) {
    fieldErrors.deadline_date = "Fecha deseada inválida.";
  }
  if (!privacyAccepted) {
    fieldErrors.privacy_accepted = "Debés aceptar el tratamiento de datos para continuar.";
  }

  const files = collectFiles(formData);
  if (files.length > MAX_QUOTE_FILES) {
    fieldErrors.attachments = `Podés adjuntar hasta ${MAX_QUOTE_FILES} archivos.`;
  }

  let totalBytes = 0;
  for (const file of files) {
    const filename = sanitizeFilename(file.name);
    const ext = getExtension(filename);
    totalBytes += file.size;

    if (file.size > MAX_QUOTE_FILE_BYTES) {
      fieldErrors.attachments = `Cada archivo puede pesar hasta 15 MB (${filename}).`;
      break;
    }
    if (!ALLOWED_QUOTE_EXTENSIONS.includes(ext as (typeof ALLOWED_QUOTE_EXTENSIONS)[number])) {
      fieldErrors.attachments = `El archivo ${filename} no tiene un formato permitido.`;
      break;
    }
    if (hasSuspiciousExtension(filename)) {
      fieldErrors.attachments = `El archivo ${filename} no está permitido.`;
      break;
    }
    if (file.type && !ALLOWED_QUOTE_MIME_TYPES.has(file.type) && file.type !== "") {
      // Algunos navegadores envían MIME vacío o genérico para STL/OBJ
      if (file.type !== "application/octet-stream" && !["stl", "obj"].includes(ext)) {
        fieldErrors.attachments = `El tipo de archivo ${filename} no está permitido.`;
        break;
      }
    }
  }

  if (totalBytes > MAX_QUOTE_TOTAL_BYTES) {
    fieldErrors.attachments = "El peso total de los archivos supera el límite permitido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Revisá los campos marcados e intentá nuevamente.", fieldErrors };
  }

  const user = await getCurrentUser();
  const admin = createAdminClient();

  // Rate limiting razonable por email
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);

  if ((count ?? 0) >= 3) {
    return { error: "Ya enviaste varias solicitudes hace poco. Esperá unos minutos e intentá de nuevo." };
  }

  const { data: quote, error } = await admin
    .from("quote_requests")
    .insert({
      user_id: user?.id ?? null,
      service_type: serviceType,
      customer_name: customerName,
      email,
      phone,
      company_name: companyName,
      description,
      quantity: quantity ?? null,
      width_mm: widthMm ?? null,
      height_mm: heightMm ?? null,
      depth_mm: depthMm ?? null,
      material,
      color,
      deadline_date: deadlineDate,
      print_color_mode: printColorMode,
      print_sides: printSides,
      paper_type: paperType,
      finish,
      detail_level: detailLevel,
      engraving_area: engravingArea,
      design_text: designText,
      figure_type: figureType,
      privacy_accepted_at: new Date().toISOString(),
      status: "new",
    })
    .select("id, quote_number")
    .single();

  if (error || !quote) {
    console.error("quote insert error", error);
    return { error: "No se pudo registrar la solicitud. Intentá nuevamente en unos minutos." };
  }

  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const safeName = sanitizeFilename(file.name);
      const ext = getExtension(safeName);
      const storagePath = `${quote.id}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage
        .from("quote-attachments")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      uploadedPaths.push(storagePath);

      const { error: metaError } = await admin.from("quote_attachments").insert({
        quote_request_id: quote.id,
        storage_path: storagePath,
        original_filename: safeName,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
      });

      if (metaError) {
        throw metaError;
      }
    }
  } catch (uploadErr) {
    console.error("quote attachment error", uploadErr);
    for (const path of uploadedPaths) {
      await admin.storage.from("quote-attachments").remove([path]);
    }
    await admin.from("quote_requests").delete().eq("id", quote.id);
    return { error: "No se pudieron subir los archivos adjuntos. Intentá con otros formatos o menos peso." };
  }

  return { success: true, quoteNumber: quote.quote_number, quoteId: quote.id };
}
