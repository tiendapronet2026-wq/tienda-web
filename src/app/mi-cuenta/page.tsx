import Link from "next/link";
import { requireAuth, getCurrentProfile } from "@/lib/auth/session";
import { getDisplayName } from "@/lib/auth/display";
import { updateProfile, changePassword } from "@/app/actions/account";
import { AccountForms, PasswordForm, ProfileForm } from "@/components/account/AccountForms";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function MyAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mensaje?: string }>;
}) {
  const user = await requireAuth("/login?redirect=/mi-cuenta");
  const profile = await getCurrentProfile();
  const { mensaje } = await searchParams;
  const name = getDisplayName(profile, user.email);

  return (
    <div className="tp-container py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Mi cuenta</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Hola, {name}</h1>
          <p className="mt-2 text-text-secondary">Gestioná tus datos personales y tu sesión.</p>
        </div>
        <Badge tone="beta">Cuenta activa</Badge>
      </div>

      {mensaje === "password-actualizado" && (
        <p className="mb-6 rounded-[var(--radius-md)] bg-brand-soft px-4 py-3 text-sm text-brand" role="status">
          Contraseña actualizada correctamente.
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <QuickLink href="/productos" title="Explorar catálogo" description="Ver productos disponibles" />
        <QuickLink href="/carrito" title="Ir al carrito" description="Revisar tu selección" />
        <QuickLink href="/productos" title="Seguir descubriendo" description="Comparar opciones del catálogo" />
      </div>

      <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <AccountForms
          profileForm={
            <ProfileForm
              action={updateProfile}
              defaultValues={{
                first_name: profile?.first_name ?? "",
                last_name: profile?.last_name ?? "",
                phone: profile?.phone ?? "",
                document_number: profile?.document_number ?? "",
                email: user.email ?? "",
              }}
            />
          }
          passwordForm={<PasswordForm action={changePassword} />}
        />
      </div>

      <section className="mt-8 rounded-[var(--radius-xl)] border border-dashed border-border bg-surface p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Mis pedidos</h2>
            <p className="mt-2 max-w-xl text-sm text-text-secondary">
              El historial de compras estará disponible próximamente, cuando el checkout esté
              habilitado.
            </p>
          </div>
          <ButtonLink href="/productos" variant="outline">
            Seguir explorando
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[var(--shadow-md)]"
    >
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </Link>
  );
}
