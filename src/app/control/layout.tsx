import { ControlShell } from "@/components/platform/ControlShell";
import { requireControlPanelAccess } from "@/lib/platform/panel-guards";

export const metadata = {
  title: "TiendaPro Control",
  robots: { index: false, follow: false },
};

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  await requireControlPanelAccess();
  return <ControlShell>{children}</ControlShell>;
}
