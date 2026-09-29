import { MmShell } from "@/components/mm-control/MmShell";
import { requireControlPanelAccess } from "@/lib/platform/panel-guards";

export default async function MmControlLayout({ children }: { children: React.ReactNode }) {
  await requireControlPanelAccess();
  return <MmShell>{children}</MmShell>;
}
