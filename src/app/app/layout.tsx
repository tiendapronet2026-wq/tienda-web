import { AppShell } from "@/components/platform/AppShell";

export const metadata = {
  title: "App cliente",
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
