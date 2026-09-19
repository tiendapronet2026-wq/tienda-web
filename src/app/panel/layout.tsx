import { PanelShell } from "@/components/platform/PanelShell";

export const metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
