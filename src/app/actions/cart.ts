"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";

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

async function getCartClient() {
  const user = await getCurrentUser();
  if (user) {
    return { supabase: await createClient(), userId: user.id, sessionId: await getSessionId() };
  }
  return { supabase: createAdminClient(), userId: null, sessionId: await getSessionId() };
}

export async function addToCart(productId: string) {
  const { supabase, userId, sessionId } = await getCartClient();

  const { data: existing } = await (userId
    ? supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", productId)
    : supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("session_id", sessionId)
        .is("user_id", null)
        .eq("product_id", productId)
  ).maybeSingle<{ id: string; quantity: number }>();

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
      user_id: userId,
    });
  }

  revalidatePath("/carrito");
  revalidatePath("/", "layout");
}

export async function updateCartItemQuantity(itemId: string, quantity: number) {
  const { supabase, userId, sessionId } = await getCartClient();

  const query = supabase.from("cart_items").delete().eq("id", itemId);

  if (userId) {
    query.eq("user_id", userId);
  } else {
    query.eq("session_id", sessionId).is("user_id", null);
  }

  if (quantity <= 0) {
    await query;
  } else {
    const updateQuery = supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", itemId);

    if (userId) {
      updateQuery.eq("user_id", userId);
    } else {
      updateQuery.eq("session_id", sessionId).is("user_id", null);
    }

    await updateQuery;
  }

  revalidatePath("/carrito");
  revalidatePath("/", "layout");
}

export async function getCartCount() {
  const { supabase, userId, sessionId } = await getCartClient();

  let query = supabase.from("cart_items").select("quantity");

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("session_id", sessionId).is("user_id", null);
  }

  const { data } = await query;
  return data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export async function getCartItems() {
  const { supabase, userId, sessionId } = await getCartClient();

  let query = supabase
    .from("cart_items")
    .select("*, products(*)")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("session_id", sessionId).is("user_id", null);
  }

  const { data } = await query;
  return data ?? [];
}
