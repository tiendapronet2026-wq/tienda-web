import { AuthField, AuthForm, AuthLink } from "@/components/auth/AuthForm";
import { signIn } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; mensaje?: string }>;
}) {
  const { redirect, mensaje } = await searchParams;

  return (
    <AuthForm
      title="Iniciar sesión"
      subtitle="Accedé a tu cuenta de TiendaPro"
      action={signIn}
      submitLabel="Ingresar"
      hiddenFields={redirect ? { redirect } : undefined}
      footer={
        <>
          ¿No tenés cuenta? <AuthLink href="/registro">Crear cuenta</AuthLink>
          <br />
          <AuthLink href="/recuperar-password">¿Olvidaste tu contraseña?</AuthLink>
        </>
      }
    >
      {mensaje === "registro-exitoso" && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Registro exitoso. Revisá tu email si se requiere confirmación e iniciá sesión.
        </p>
      )}
      <AuthField label="Email" name="email" type="email" required autoComplete="email" />
      <AuthField
        label="Contraseña"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
    </AuthForm>
  );
}
