"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSiteUrl } from "@/lib/cart/session";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!firstName || !lastName || !email || !password) {
    return { error: "Completá todos los campos obligatorios." };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${getSiteUrl()}/login`,
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect("/login?mensaje=registro-exitoso");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/mi-cuenta");

  if (!email || !password) {
    return { error: "Ingresá tu email y contraseña." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      return { error: "Tu cuenta está suspendida. Contactá al soporte." };
    }

    await mergeAnonymousCart(data.user.id);
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Ingresá tu email." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/actualizar-password`,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return { success: "Te enviamos un enlace para restablecer tu contraseña." };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect("/mi-cuenta?mensaje=password-actualizado");
}

async function mergeAnonymousCart(userId: string) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return;

  const admin = createAdminClient();
  await admin.rpc("merge_anonymous_cart", {
    p_session_id: sessionId,
    p_user_id: userId,
  });
}

function translateAuthError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese email.";
  }
  if (message.includes("Password should be at least")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return message;
}
