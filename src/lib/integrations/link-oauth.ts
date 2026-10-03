import { createClient } from "@/lib/supabase/server";
import { encryptCredentialPayload, decryptCredentialPayload } from "@/lib/integrations/credentials";

export async function attachLinkSessionOAuth(
  sessionId: string,
  oauthState: string,
  codeChallenge: string,
  codeVerifier: string,
): Promise<void> {
  const { ciphertext } = encryptCredentialPayload(codeVerifier);
  const supabase = await createClient();
  const { error } = await supabase.rpc("attach_integration_link_oauth", {
    p_session_id: sessionId,
    p_oauth_state: oauthState,
    p_code_challenge: codeChallenge,
    p_pkce_ciphertext: ciphertext,
  });
  if (error) throw new Error(error.message);
}

export function decryptPkceVerifier(ciphertext: string): string {
  return decryptCredentialPayload(ciphertext);
}
