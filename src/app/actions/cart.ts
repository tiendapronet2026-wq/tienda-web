"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SESSION_COOKIE = "tienda_session";

async function getSessionId() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return sessionId;
}

export async function addToCart(productId: string) {
  const supabase = await createClient();
  const sessionId = await getSessionId();

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("session_id", sessionId)
    .eq("product_id", productId)
    .maybeSingle<{ id: string; quantity: number }>();

  if (existing) {
    await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("cart_items").insert({
      session_id: sessionId,
      product_id: productId,
      quantity: 1,
    });
  }

  revalidatePath("/carrito");
  revalidatePath("/", "layout");
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const supabase = await createClient();
  const sessionId = await getSessionId();

  if (quantity <= 0) {
    await supabase
      .from("cart_items")
      .delete()
      .eq("id", itemId)
      .eq("session_id", sessionId);
  } else {
    await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId)
      .eq("session_id", sessionId);
  }

  revalidatePath("/carrito");
  revalidatePath("/", "layout");
}

export async function getCartCount() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return 0;

  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("session_id", sessionId);

  return data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export async function getCartItems() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return [];

  const { data } = await supabase
    .from("cart_items")
    .select("*, products(*)")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
