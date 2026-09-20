"use client";

import { useEffect } from "react";
import { hasImplicitRecoveryTokens, PASSWORD_UPDATE_PATH } from "@/lib/auth/password-recovery";

/**
 * Supabase (implicit) suele redirigir al Site URL con #access_token&type=recovery.
 * Reenvía a /actualizar-password conservando el hash para establecer sesión.
 */
export function RecoveryHashRedirect() {
  useEffect(() => {
    const { pathname, hash } = window.location;
    if (pathname === PASSWORD_UPDATE_PATH || !hash || !hasImplicitRecoveryTokens(hash)) {
      return;
    }
    window.location.replace(`${PASSWORD_UPDATE_PATH}${hash}`);
  }, []);

  return null;
}
