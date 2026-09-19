import { ControlShell } from "@/components/platform/ControlShell";

export const metadata = {
  title: "TiendaPro Control",
  robots: { index: false, follow: false },
};

export default function ControlLayout({ children }: { children: React.ReactNode }) {
  return <ControlShell>{children}</ControlShell>;
}
