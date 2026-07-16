/** URLs remotas conocidas rotas → asset local (sin mutar Supabase). */
const KNOWN_BROKEN_IMAGE_URLS: Record<string, string> = {
  "https://images.unsplash.com/photo-1514228742589-6d155d445b8e?w=800&q=80":
    "/products/set-tazas-ceramica.jpg",
  "https://images.unsplash.com/photo-1514228742589-6d155d445b8e":
    "/products/set-tazas-ceramica.jpg",
};

/** Resuelve image_url del catálogo a una URL usable por next/image. */
export function resolveProductImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  const mapped = KNOWN_BROKEN_IMAGE_URLS[trimmed];
  if (mapped) return mapped;

  // Misma foto Unsplash con otros query params
  if (trimmed.includes("photo-1514228742589-6d155d445b8e")) {
    return "/products/set-tazas-ceramica.jpg";
  }

  return trimmed;
}
