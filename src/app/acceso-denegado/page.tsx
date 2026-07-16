import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-foreground">Acceso denegado</h1>
      <p className="mt-4 text-text-secondary">
        No tenés permisos para acceder a esta sección.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/" className="rounded-xl bg-hero px-5 py-2 text-sm font-semibold text-white">
          Ir al inicio
        </Link>
        <Link
          href="/mi-cuenta"
          className="rounded-xl border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground"
        >
          Mi cuenta
        </Link>
      </div>
    </div>
  );
}
