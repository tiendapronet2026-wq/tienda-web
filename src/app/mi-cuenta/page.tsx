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
      <p className="mt-2 text-zinc-500">Gestioná tus datos personales y tu sesión.</p>

      {mensaje === "password-actualizado" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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

      <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-6">
        <h2 className="text-lg font-semibold">Mis pedidos</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Próximamente vas a poder ver el historial de tus compras acá.
        </p>
        <Link href="/productos" className="mt-4 inline-flex text-sm font-medium text-emerald-600">
          Seguir comprando →
        </Link>
      </section>
    </div>
  );
}
