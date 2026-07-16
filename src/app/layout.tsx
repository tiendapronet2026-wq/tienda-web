import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { HeaderNav } from "@/components/Header";
import { getCartCount } from "@/app/actions/cart";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TiendaPro | Tu tienda online",
  description: "Comprá los mejores productos con envío a todo el país.",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
          {!isAdminRoute && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 sm:text-sm">
              Sitio en etapa beta. Las compras online estarán disponibles
              próximamente.
            </div>
          )}
          {!isAdminRoute && <HeaderNav cartCount={cartCount} />}
          <main>{children}</main>
          {!isAdminRoute && (
            <footer className="border-t border-zinc-200 bg-white py-8 text-center text-sm text-zinc-500">
              © {new Date().getFullYear()} TiendaPro. Todos los derechos reservados.
            </footer>
          )}
        </div>
      </body>
    </html>
  );
}
