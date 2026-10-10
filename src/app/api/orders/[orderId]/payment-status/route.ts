import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  if (!orderId) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_order_payment_status_safe", {
    p_order_id: orderId,
  });

  if (error) {
    return NextResponse.json({ found: false }, { status: 500 });
  }

  return NextResponse.json(data ?? { found: false });
}
