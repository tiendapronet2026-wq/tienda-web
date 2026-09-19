import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { PublicHeader } from "@/components/platform/PublicHeader";
import { PublicFooter } from "@/components/platform/PublicFooter";
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
    default: "TiendaPro | Plataforma comercial y operaciones",
    template: "%s | TiendaPro",
  },
  description:
    "TiendaPro 3.0: servicios digitales, showroom de demos y centro de operaciones multiproyecto.",
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
    title: "TiendaPro | Plataforma comercial y operaciones",
    description: "Servicios digitales, demos interactivas y panel de operaciones.",
    images: [{ url: "/brand/og-tiendapro.png", width: 1200, height: 630, alt: "TiendaPro" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPanel = pathname.startsWith("/panel");
  const isLegacyAdmin = pathname.startsWith("/admin");

  const showPublicChrome = !isPanel && !isLegacyAdmin;

  return (
    <html lang="es">
      <body className={`${plusJakarta.variable} antialiased`}>
        <div className="min-h-screen bg-background text-foreground">
          {showPublicChrome && <PublicHeader />}
          <main>{children}</main>
          {showPublicChrome && <PublicFooter />}
        </div>
      </body>
    </html>
  );
}
