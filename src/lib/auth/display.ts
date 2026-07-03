import type { Profile } from "@/lib/auth/session";

export function getDisplayName(profile: Profile | null, email?: string) {
  if (profile?.first_name || profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`.trim();
  }
  return email ?? "Usuario";
}

export function getInitials(profile: Profile | null, email?: string) {
  const name = getDisplayName(profile, email);
  const parts = name.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
