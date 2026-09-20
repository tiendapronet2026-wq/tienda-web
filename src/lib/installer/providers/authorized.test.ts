import { describe, expect, it } from "vitest";
import { assertAuthorizedTarget } from "@/lib/installer/providers/authorized";

describe("installer authorized targets", () => {
  it("rechaza repo no autorizado en modo estricto", () => {
    const prev = process.env.INSTALLER_AUTHORIZED_ONLY;
    process.env.INSTALLER_AUTHORIZED_ONLY = "1";
    expect(assertAuthorizedTarget("github", "other/repo")).toMatch(/solo/i);
    process.env.INSTALLER_AUTHORIZED_ONLY = prev;
  });

  it("acepta recursos TiendaPro en modo estricto", () => {
    const prev = process.env.INSTALLER_AUTHORIZED_ONLY;
    process.env.INSTALLER_AUTHORIZED_ONLY = "1";
    expect(assertAuthorizedTarget("github", "tiendapronet2026-wq/tienda-web")).toBeNull();
    process.env.INSTALLER_AUTHORIZED_ONLY = prev;
  });
});
