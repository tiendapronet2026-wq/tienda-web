import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-zinc-900">Acceso denegado</h1>
      <p className="mt-4 text-zinc-500">
        No tenés permisos para acceder a esta sección.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/" className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white">
          Ir al inicio
        </Link>
        <Link href="/mi-cuenta" className="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-semibold">
          Mi cuenta
        </Link>
      </div>
    </div>
  );
}
