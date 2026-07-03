import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  document_number: string | null;
  avatar_url: string | null;
  role: "customer" | "admin" | "seller";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return profile;
}

export async function requireAuth(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);

  const profile = await getCurrentProfile();
  if (profile?.status === "suspended") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=suspendido");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    redirect("/acceso-denegado");
  }

  return { user, profile };
}
