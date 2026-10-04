import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isFacebookSalesEnabled } from "@/lib/sales/flags";
import { MetaMessengerProvider } from "@/lib/sales/meta/meta-messenger-provider";
import { handleIncomingMessengerMessages } from "@/lib/sales/messenger-handler";

const provider = new MetaMessengerProvider();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = provider.verifyWebhook({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });

  if (!result.ok) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(result.challenge, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!provider.verifyPostSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  if (!isFacebookSalesEnabled()) {
    return NextResponse.json({ ok: true, skipped: "sales_disabled" });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { messages, ignored } = provider.parseIncomingEvents(payload);
  if (!messages.length) {
    return NextResponse.json({ ok: true, processed: 0, ignored });
  }

  const admin = createAdminClient();
  const result = await handleIncomingMessengerMessages(admin, provider, messages);

  return NextResponse.json({ ok: true, ...result, ignored });
}
