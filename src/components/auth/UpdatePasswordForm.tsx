"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AuthField, AuthForm } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_CALLBACK_PATH,
  PASSWORD_UPDATE_PATH,
  buildAuthCallbackRedirectPath,
  hasImplicitRecoveryTokens,
  parseRecoveryUrlParams,
} from "@/lib/auth/password-recovery";

async function updatePasswordClient(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sesión inválida. Solicitá un nuevo enlace de recuperación." };
  }

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
      const { search, hash, pathname } = window.location;

      const parsed = parseRecoveryUrlParams(search, hash);
      const callbackPath = buildAuthCallbackRedirectPath({
        code: parsed.code,
        tokenHash: parsed.tokenHash,
        type: parsed.type ?? "recovery",
        next: PASSWORD_UPDATE_PATH,
      });

      if (callbackPath && pathname !== AUTH_CALLBACK_PATH) {
        window.location.replace(callbackPath);
        return;
      }

      if (hasImplicitRecoveryTokens(hash)) {
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
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
          window.history.replaceState(null, "", pathname);
          router.refresh();
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!cancelled) {
        if (user && !userError) {
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
