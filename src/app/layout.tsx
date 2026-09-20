import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";
import { PublicHeader } from "@/components/platform/PublicHeader";
import { PublicFooter } from "@/components/platform/PublicFooter";
import { BrandingStyles } from "@/components/branding/BrandingStyles";
import { RecoveryHashRedirect } from "@/components/auth/RecoveryHashRedirect";
import { loadRuntimeStoreBranding } from "@/lib/branding/load-runtime-branding";
import { buildStoreMetadata } from "@/lib/branding/metadata";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tiendapro.net";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await loadRuntimeStoreBranding();
  return buildStoreMetadata(branding, siteUrl);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const hidePublicChrome =
    pathname.startsWith("/control") ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/panel") ||
    pathname.startsWith("/admin");

  const branding = await loadRuntimeStoreBranding();

  return (
    <html lang="es">
      <body className={`${plusJakarta.variable} antialiased`} style={{ fontFamily: branding.fontFamily }}>
        <BrandingStyles branding={branding} />
        <RecoveryHashRedirect />
        <div className="min-h-screen bg-background text-foreground">
          {hidePublicChrome ? null : <PublicHeader branding={branding} />}
          <main>{children}</main>
          {hidePublicChrome ? null : <PublicFooter branding={branding} />}
        </div>
      </body>
    </html>
  );
}
