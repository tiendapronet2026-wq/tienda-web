import { NextResponse } from "next/server";
import { completeMercadoPagoOAuthCallback } from "@/lib/integrations/integration-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim();
  const state = url.searchParams.get("state")?.trim();
  const oauthError = url.searchParams.get("error")?.trim();

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.tiendapro.net";
  const successRedirect = `${site}/connect/mercadopago/ok`;
  const failRedirect = `${site}/connect/mercadopago/error`;

  if (oauthError || !code || !state) {
    return NextResponse.redirect(failRedirect);
  }

  try {
    await completeMercadoPagoOAuthCallback(state, code);
    return NextResponse.redirect(successRedirect);
  } catch {
    return NextResponse.redirect(failRedirect);
  }
}
