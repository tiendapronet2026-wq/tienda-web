import { AuthField, AuthForm } from "@/components/auth/AuthForm";
import { updatePassword } from "@/app/actions/auth";

export default function UpdatePasswordPage() {
  return (
    <AuthForm
      title="Nueva contraseña"
      subtitle="Elegí una contraseña segura de al menos 8 caracteres"
      action={updatePassword}
      submitLabel="Actualizar contraseña"
    >
      <AuthField
        label="Nueva contraseña"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
    </AuthForm>
  );
}
