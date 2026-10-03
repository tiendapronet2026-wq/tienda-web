export type IntegrationProviderId = "link_demo" | "whatsapp" | "mercadopago" | "meta";

export type LinkSessionContext = {
  sessionId: string;
  provider: IntegrationProviderId;
  requestedByUserId: string;
  tokenHash: string;
};

export type AuthorizationStartResult = {
  /** Si el proveedor usa redirect OAuth clásico (futuro). */
  authorizationUrl?: string;
};

export type AuthorizationCompleteInput = {
  tokenHash: string;
  oauthState?: string | null;
  oauthCode?: string | null;
  pkceVerifierCiphertext?: string | null;
};

export type AuthorizationCompleteResult = {
  displayName: string;
  externalAccountId: string;
  externalAccountLabel: string;
  connectionType: string;
  metadata: Record<string, unknown>;
  /** JSON serializable; se cifra server-side, nunca sale al cliente. */
  credentialPayload?: Record<string, unknown>;
};

export type VerifyConnectionResult = {
  ok: boolean;
  message?: string;
};

export interface IntegrationProvider {
  id: IntegrationProviderId;
  displayName: string;
  connectionType: string;
  /** false = tarjeta visible pero sin flujo real (Gate 3G+). */
  isImplemented: boolean;
  /** Tras confirm en /connect, redirigir a OAuth del proveedor (no finalizar aún). */
  usesOAuthRedirect?: boolean;
  startAuthorization(ctx: LinkSessionContext): Promise<AuthorizationStartResult>;
  completeAuthorization(input: AuthorizationCompleteInput): Promise<AuthorizationCompleteResult>;
  verifyConnection(connectionId: string): Promise<VerifyConnectionResult>;
  revokeConnection(connectionId: string): Promise<void>;
  /** OAuth refresh — implementar por proveedor en Gate 3G+. */
  refreshCredentials?(connectionId: string): Promise<void>;
}
