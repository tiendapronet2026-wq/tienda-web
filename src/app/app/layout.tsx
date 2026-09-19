import { AppShell } from "@/components/platform/AppShell";
import { requireAppPanelAccess } from "@/lib/platform/panel-guards";

export const metadata = {
  title: "App cliente",
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAppPanelAccess();
  return <AppShell>{children}</AppShell>;
}
