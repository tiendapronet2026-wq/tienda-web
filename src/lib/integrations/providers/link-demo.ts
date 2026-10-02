import type {
  AuthorizationCompleteInput,
  AuthorizationCompleteResult,
  AuthorizationStartResult,
  IntegrationProvider,
  VerifyConnectionResult,
} from "@/lib/integrations/providers/types";

/** Piloto Gate 3F: valida QR + sesión sin proveedor externo ni costo. */
export const linkDemoProvider: IntegrationProvider = {
  id: "link_demo",
  displayName: "Laboratorio de vinculación",
  connectionType: "demo",
  isImplemented: true,

  async startAuthorization(): Promise<AuthorizationStartResult> {
    return {};
  },

  async completeAuthorization(
    input: AuthorizationCompleteInput,
  ): Promise<AuthorizationCompleteResult> {
    const suffix = input.tokenHash.slice(0, 8);
    return {
      displayName: "Laboratorio Tienda Pro",
      externalAccountId: `demo-${suffix}`,
      externalAccountLabel: `Cuenta demo ····${suffix}`,
      connectionType: "demo",
      metadata: { pilot: true, gate: "3f" },
      credentialPayload: {
        type: "demo",
        issued_at: new Date().toISOString(),
        note: "Token simulado — sin proveedor externo",
      },
    };
  },

  async verifyConnection(connectionId: string): Promise<VerifyConnectionResult> {
    void connectionId;
    return { ok: true, message: "Conexión demo verificada localmente." };
  },

  async revokeConnection(connectionId: string): Promise<void> {
    void connectionId;
  },
};
