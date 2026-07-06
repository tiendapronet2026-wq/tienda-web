"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getExistingSessionId,
  getOrCreateSessionId,
  MAX_CART_QUANTITY,
} from "@/lib/cart/session";

async function getCartClientReadOnly() {
  const user = await getCurrentUser();
  if (user) {
    return { supabase: await createClient(), userId: user.id, sessionId: null as string | null };
  }
  return {
    supabase: createAdminClient(),
    userId: null,
    sessionId: await getExistingSessionId(),
  };
}

async function getCartClientForMutation() {
  const user = await getCurrentUser();
  if (user) {
    return { supabase: await createClient(), userId: user.id, sessionId: null as string | null };
  }
  return {
    supabase: createAdminClient(),
    userId: null,
    sessionId: await getOrCreateSessionId(),
  };
}

async function validateProductForCart(supabase: ReturnType<typeof createAdminClient>, productId: string) {
  const { data: product } = await supabase
    .from("products")
    .select("id, is_active, stock, track_stock")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_active) {
    throw new Error("Producto no disponible.");
  }

  if (product.track_stock && product.stock <= 0) {
    throw new Error("Producto sin stock.");
  }

  return product;
}

export async function addToCart(productId: string) {
  const { supabase, userId, sessionId } = await getCartClientForMutation();
  const product = await validateProductForCart(
    userId ? createAdminClient() : supabase,
    productId
  );

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

  const nextQuantity = Math.min(
    (existing?.quantity ?? 0) + 1,
    product.track_stock ? Math.min(product.stock, MAX_CART_QUANTITY) : MAX_CART_QUANTITY
  );

  if (existing && nextQuantity === existing.quantity) {
    return;
  }

  if (existing) {
    await supabase.from("cart_items").update({ quantity: nextQuantity }).eq("id", existing.id);
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
  const { supabase, userId, sessionId } = await getCartClientReadOnly();

  if (!userId && !sessionId) {
    return;
  }

  const boundedQuantity = Math.min(Math.max(quantity, 0), MAX_CART_QUANTITY);

  if (boundedQuantity <= 0) {
    const deleteQuery = supabase.from("cart_items").delete().eq("id", itemId);
    if (userId) {
      deleteQuery.eq("user_id", userId);
    } else {
      deleteQuery.eq("session_id", sessionId).is("user_id", null);
    }
    await deleteQuery;
  } else {
    const updateQuery = supabase
      .from("cart_items")
      .update({ quantity: boundedQuantity })
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
  const { supabase, userId, sessionId } = await getCartClientReadOnly();

  if (!userId && !sessionId) {
    return 0;
  }

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
  const { supabase, userId, sessionId } = await getCartClientReadOnly();

  if (!userId && !sessionId) {
    return [];
  }

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
