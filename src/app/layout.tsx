import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { HeaderNav } from "@/components/Header";
import { BetaBanner } from "@/components/BetaBanner";
import { SiteFooter } from "@/components/SiteFooter";
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
    default: "TiendaPro | Productos y soluciones personalizadas",
    template: "%s | TiendaPro",
  },
  description:
    "Convertimos tus ideas en productos reales. Impresiones, impresión 3D, grabado láser, corte de polifan y un catálogo de productos para cada proyecto.",
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
    title: "TiendaPro | Productos y soluciones personalizadas",
    description:
      "Convertimos tus ideas en productos reales. Impresiones, impresión 3D, grabado láser, corte de polifan y un catálogo de productos para cada proyecto.",
    images: [{ url: "/brand/og-tiendapro.png", width: 1200, height: 630, alt: "TiendaPro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TiendaPro | Productos y soluciones personalizadas",
    description:
      "Convertimos tus ideas en productos reales. Impresiones, impresión 3D, grabado láser, corte de polifan y un catálogo de productos para cada proyecto.",
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
          {!isAdminRoute && <BetaBanner />}
          {!isAdminRoute && <HeaderNav cartCount={cartCount} />}
          <main>{children}</main>
          {!isAdminRoute && <SiteFooter />}
        </div>
      </body>
    </html>
  );
}
