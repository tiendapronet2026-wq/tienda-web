"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthField, AuthForm } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";

async function updatePasswordClient(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.message.includes("Password should be at least")) {
      return { error: "La contraseña debe tener al menos 8 caracteres." };
    }
    return { error: error.message };
  }
  await supabase.auth.signOut();
  return { success: "ok" };
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      const supabase = createClient();
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) {
            if (!cancelled) {
              setError("El enlace no es válido o expiró. Solicitá uno nuevo.");
              setReady(false);
            }
            return;
          }
          window.history.replaceState(null, "", window.location.pathname);
          router.refresh();
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        if (session) {
          setReady(true);
          setError(null);
        } else {
          setError("Abrí el enlace de recuperación desde tu email o solicitá uno nuevo.");
          setReady(false);
        }
      }
    }

    establishRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleAction = async (formData: FormData) => {
    const result = await updatePasswordClient(formData);
    if (result.error) return result;
    startTransition(() => {
      router.push("/login?mensaje=password-actualizado");
    });
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-md)]">
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-xl)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-md)]">
        <p className="text-sm text-text-secondary">Validando enlace de recuperación…</p>
      </div>
    );
  }

  return (
    <AuthForm
      title="Nueva contraseña"
      subtitle="Elegí una contraseña segura de al menos 8 caracteres"
      action={handleAction}
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
