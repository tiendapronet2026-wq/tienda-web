import { redirect } from "next/navigation";

/** Compatibilidad: /panel → TiendaPro Control */
export default function PanelRedirectPage() {
  redirect("/control");
}
