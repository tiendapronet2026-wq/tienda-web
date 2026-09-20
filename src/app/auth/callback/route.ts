import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeAuthCallbackNext } from "@/lib/auth/password-recovery";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextPath = sanitizeAuthCallbackNext(searchParams.get("next"));

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = nextPath;
  redirectTo.search = "";
  redirectTo.hash = "";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/recuperar-password";
  errorUrl.search = "error=enlace-invalido";
  return NextResponse.redirect(errorUrl);
}
