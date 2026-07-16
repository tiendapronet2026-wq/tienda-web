import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { HeaderNav } from "@/components/Header";
import { BrandLogo } from "@/components/BrandLogo";
import { getCartCount } from "@/app/actions/cart";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tiendapro.net";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TiendaPro | Tu tienda online",
    template: "%s | TiendaPro",
  },
  description: "Comprá los mejores productos con envío a todo el país.",
  applicationName: "TiendaPro",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteUrl,
    siteName: "TiendaPro",
    title: "TiendaPro | Tu tienda online",
    description: "Comprá los mejores productos con envío a todo el país.",
    images: [{ url: "/brand/og-tiendapro.png", width: 1200, height: 630, alt: "TiendaPro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TiendaPro | Tu tienda online",
    description: "Comprá los mejores productos con envío a todo el país.",
    images: ["/brand/og-tiendapro.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isAdminRoute = pathname.startsWith("/admin");
  const cartCount = isAdminRoute ? 0 : await getCartCount();

  return (
    <html lang="es">
      <body className={`${plusJakarta.variable} antialiased`}>
        <div className="min-h-screen bg-background text-foreground">
          {!isAdminRoute && (
            <div className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-xs text-warning sm:text-sm">
              Sitio en etapa beta. Las compras online estarán disponibles
              próximamente.
            </div>
          )}
          {!isAdminRoute && <HeaderNav cartCount={cartCount} />}
          <main>{children}</main>
          {!isAdminRoute && (
            <footer className="border-t border-border bg-hero text-white">
              <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:justify-between sm:px-6">
                <BrandLogo variant="dark" href="/" />
                <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-white/70">
                  <Link href="/productos" className="transition hover:text-white">
                    Productos
                  </Link>
                  <Link href="/login" className="transition hover:text-white">
                    Iniciar sesión
                  </Link>
                  <Link href="/carrito" className="transition hover:text-white">
                    Carrito
                  </Link>
                </nav>
                <p className="text-center text-sm text-white/50">
                  © {new Date().getFullYear()} TiendaPro. Todos los derechos reservados.
                </p>
              </div>
            </footer>
          )}
        </div>
      </body>
    </html>
  );
}
