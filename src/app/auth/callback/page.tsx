"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PASSWORD_UPDATE_PATH,
  hasImplicitRecoveryTokens,
  parseRecoveryUrlParams,
  sanitizeAuthCallbackNext,
} from "@/lib/auth/password-recovery";

export default function AuthCallbackPage() {
  const [message] = useState("Procesando enlace de recuperación…");

  useEffect(() => {
    let cancelled = false;

    async function completeAuthCallback() {
      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const nextPath = sanitizeAuthCallbackNext(params.get("next"));
      const { code, tokenHash, type } = parseRecoveryUrlParams(
        window.location.search,
        window.location.hash
      );

      if (hasImplicitRecoveryTokens(window.location.hash)) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error && !cancelled) {
            window.location.replace(nextPath);
            return;
          }
        }
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && !cancelled) {
          window.location.replace(nextPath);
          return;
        }
      }

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        if (!error && !cancelled) {
          window.location.replace(nextPath);
          return;
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !cancelled) {
        window.location.replace(nextPath);
        return;
      }

      if (!cancelled) {
        window.location.replace("/recuperar-password?error=enlace-invalido");
      }
    }

    completeAuthCallback();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-text-secondary">{message}</div>
  );
}
