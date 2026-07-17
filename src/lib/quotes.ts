import type { ServiceSlug } from "@/lib/services";

export type QuoteStatus =
  | "new"
  | "reviewing"
  | "information_requested"
  | "quoted"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export const QUOTE_STATUSES: QuoteStatus[] = [
  "new",
  "reviewing",
  "information_requested",
  "quoted",
  "accepted",
  "rejected",
  "cancelled",
  "completed",
];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Recibida",
  reviewing: "En revisión",
  information_requested: "Necesitamos información",
  quoted: "Cotizada",
  accepted: "Aceptada",
  rejected: "No disponible",
  cancelled: "Cancelada",
  completed: "Finalizada",
};

export const QUOTE_STATUS_TONES: Record<
  QuoteStatus,
  "brand" | "beta" | "available" | "active" | "soldout" | "inactive" | "neutral"
> = {
  new: "brand",
  reviewing: "beta",
  information_requested: "beta",
  quoted: "available",
  accepted: "active",
  rejected: "soldout",
  cancelled: "inactive",
  completed: "neutral",
};

export type QuoteRequest = {
  id: string;
  quote_number: string;
  user_id: string | null;
  service_type: ServiceSlug;
  customer_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  description: string;
  quantity: number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  material: string | null;
  color: string | null;
  deadline_date: string | null;
  print_color_mode: "color" | "bn" | null;
  print_sides: "simple" | "doble" | null;
  paper_type: string | null;
  finish: string | null;
  detail_level: "basico" | "medio" | "alto" | null;
  engraving_area: string | null;
  design_text: string | null;
  figure_type: string | null;
  status: QuoteStatus;
  internal_notes: string | null;
  privacy_accepted_at: string;
  created_at: string;
  updated_at: string;
};

export type QuoteAttachment = {
  id: string;
  quote_request_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

export const ALLOWED_QUOTE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "pdf",
  "svg",
  "stl",
  "obj",
  "zip",
] as const;

export const ALLOWED_QUOTE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "image/svg+xml",
  "model/stl",
  "application/sla",
  "model/obj",
  "text/plain",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
]);

export const MAX_QUOTE_FILES = 5;
export const MAX_QUOTE_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_QUOTE_TOTAL_BYTES = 40 * 1024 * 1024;

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as string[]).includes(value);
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "archivo";
  return base.replace(/[^\w.\-() ]+/g, "_").slice(0, 180) || "archivo";
}

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1] ?? "";
}

export function hasSuspiciousExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  const parts = lower.split(".");
  if (parts.length > 2) {
    const dangerous = ["exe", "bat", "cmd", "js", "msi", "scr", "com", "php", "sh"];
    return parts.slice(0, -1).some((part) => dangerous.includes(part));
  }
  return false;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
