import { AuthField, AuthForm, AuthLink } from "@/components/auth/AuthForm";
import { signUp } from "@/app/actions/auth";

export default function RegisterPage() {
  return (
    <AuthForm
      title="Crear cuenta"
      subtitle="Registrate para comprar y gestionar tus pedidos"
      action={signUp}
      submitLabel="Registrarme"
      footer={
        <>
          ¿Ya tenés cuenta? <AuthLink href="/login">Iniciar sesión</AuthLink>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField label="Nombre" name="first_name" required autoComplete="given-name" />
        <AuthField label="Apellido" name="last_name" required autoComplete="family-name" />
      </div>
      <AuthField label="Email" name="email" type="email" required autoComplete="email" />
      <AuthField
        label="Contraseña"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
    </AuthForm>
  );
}
