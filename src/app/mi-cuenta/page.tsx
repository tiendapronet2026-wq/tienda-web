import Link from "next/link";
import { requireAuth, getCurrentProfile } from "@/lib/auth/session";
import { updateProfile, changePassword } from "@/app/actions/account";
import { AccountForms, PasswordForm, ProfileForm } from "@/components/account/AccountForms";

export default async function MyAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ mensaje?: string }>;
}) {
  const user = await requireAuth("/login?redirect=/mi-cuenta");
  const profile = await getCurrentProfile();
  const { mensaje } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Mi cuenta</h1>
      <p className="mt-2 text-muted">Gestioná tus datos personales y tu sesión.</p>

      {mensaje === "password-actualizado" && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand">
          Contraseña actualizada correctamente.
        </p>
      )}

      <div className="mt-8">
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

      <section className="mt-8 rounded-2xl border border-dashed border-border p-6">
        <h2 className="text-lg font-semibold">Mis pedidos</h2>
        <p className="mt-2 text-sm text-muted">
          Próximamente vas a poder ver el historial de tus compras acá.
        </p>
        <Link href="/productos" className="mt-4 inline-flex text-sm font-medium text-brand">
          Seguir comprando →
        </Link>
      </section>
    </div>
  );
}
