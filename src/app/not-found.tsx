import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="tp-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Página no encontrada
      </h1>
      <p className="mt-3 max-w-md text-text-secondary">
        El enlace puede estar desactualizado o el recurso ya no está disponible.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Volver al inicio</ButtonLink>
        <ButtonLink href="/productos" variant="outline">
          Ver catálogo
        </ButtonLink>
      </div>
      <Link href="/login" className="mt-6 text-sm text-muted hover:text-brand">
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
