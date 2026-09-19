export function DemoPublicBanner({ realm }: { realm: "control" | "app" | "showroom" }) {
  const copy = {
    control:
      "TiendaPro Control · vista demo pública · sin autenticación · no es un panel privado protegido",
    app: "App cliente SaaS · demo pública · datos ficticios · acceso real requerirá sesión y tenant",
    showroom: "Showroom · datos ficticios · no conectado a producción",
  };
  return (
    <div className="border-b border-warning/25 bg-warning-soft px-4 py-2 text-center text-xs text-warning sm:text-sm">
      {copy[realm]}
    </div>
  );
}
