import { createClient } from "@supabase/supabase-js";

const url = "https://dnptsudsxrcamtxfiszh.supabase.co";
const serviceKey = process.env.SR;
const anonKey = process.env.ANON;
const email = "tiendapro.net.2026@gmail.com";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey);

const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
const u = users.users.find((x) => x.email === email);
if (!u) {
  console.log("ADMIN_USER_MISSING");
  process.exit(1);
}

const tempPass = `TpUiVerify-${crypto.randomUUID().slice(0, 8)}!aA1`;
await admin.auth.admin.updateUserById(u.id, { password: tempPass, email_confirm: true });

const { data: signIn, error } = await anon.auth.signInWithPassword({
  email,
  password: tempPass,
});
if (error) {
  console.log("SIGNIN_FAIL", error.message);
  process.exit(1);
}

const { data: prof } = await anon
  .from("profiles")
  .select("role")
  .eq("id", signIn.user.id)
  .single();

console.log("ADMIN_SIGNIN_OK role=" + prof?.role);

await admin.auth.admin.updateUserById(u.id, {
  password: crypto.randomUUID() + "!Aa1zz",
});
