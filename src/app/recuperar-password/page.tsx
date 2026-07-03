import { AuthField, AuthForm, AuthLink } from "@/components/auth/AuthForm";
import { requestPasswordReset } from "@/app/actions/auth";

export default function RecoverPasswordPage() {
  return (
    <AuthForm
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace a tu email"
      action={requestPasswordReset}
      submitLabel="Enviar enlace"
      footer={<AuthLink href="/login">Volver al inicio de sesión</AuthLink>}
    >
      <AuthField label="Email" name="email" type="email" required autoComplete="email" />
    </AuthForm>
  );
}
