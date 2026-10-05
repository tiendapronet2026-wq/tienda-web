import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoWebhookSecret } from "@/lib/integrations/mercadopago/webhook-secret";
import { verifyMercadoPagoWebhookSignature } from "@/lib/integrations/mercadopago/webhook-signature";
import { syncMercadoPagoOrderAndFulfill } from "@/lib/integrations/mercadopago/order-fulfillment";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("data_id");
  const type = url.searchParams.get("type") ?? "";

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!xRequestId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let secret: string;
  try {
    secret = getMercadoPagoWebhookSecret();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const valid = verifyMercadoPagoWebhookSignature({
    xSignature,
    xRequestId,
    dataId,
    secret,
  });
  if (!valid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const notificationType = String(body.type ?? type ?? "");
  if (notificationType && notificationType !== "order") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const mpOrderId =
    (typeof body.data === "object" && body.data && "id" in (body.data as object)
      ? String((body.data as { id?: string }).id ?? "")
      : "") || (dataId ?? "");

  if (!mpOrderId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: inboxErr } = await admin.from("mercadopago_webhook_events").insert({
    x_request_id: xRequestId,
    mp_order_id: mpOrderId,
    notification_type: notificationType || "order",
    action: typeof body.action === "string" ? body.action : null,
    outcome: "received",
  });

  if (inboxErr) {
    if (inboxErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  try {
    const result = await syncMercadoPagoOrderAndFulfill(mpOrderId, admin);
    await admin
      .from("mercadopago_webhook_events")
      .update({ outcome: result.reason, processed_at: new Date().toISOString() })
      .eq("x_request_id", xRequestId);
    return NextResponse.json({ ok: result.ok, reason: result.reason });
  } catch {
    await admin
      .from("mercadopago_webhook_events")
      .update({ outcome: "processing_error", processed_at: new Date().toISOString() })
      .eq("x_request_id", xRequestId);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
