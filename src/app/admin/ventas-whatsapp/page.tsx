import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { maskExternalUserId } from "@/lib/sales/conversation-repository";
import { CloseConversationButton } from "@/components/admin/CloseConversationButton";

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminVentasWhatsAppPage() {
  await requireAdmin();
  const supabase = await createClient();
  const todayStart = startOfTodayIso();

  const { data: conversations } = await supabase
    .from("sales_conversations")
    .select("id, external_user_id, state, handoff_requested, last_message_at, tracking_token")
    .eq("channel", "whatsapp_business")
    .order("last_message_at", { ascending: false })
    .limit(100);

  const rows = conversations ?? [];
  const todayCount = rows.filter((r) => r.last_message_at >= todayStart).length;
  const interested = rows.filter((r) => r.state === "interested").length;
  const checkoutSent = rows.filter((r) => r.state === "checkout_sent").length;
  const purchased = rows.filter((r) => r.state === "purchased").length;
  const needsAttention = rows.filter(
    (r) => r.handoff_requested || r.state === "handoff",
  ).length;

  const lastMessages = new Map<string, string>();
  if (rows.length) {
    const { data: msgs } = await supabase
      .from("sales_messages")
      .select("conversation_id, text, created_at")
      .in("conversation_id", rows.map((r) => r.id))
      .order("created_at", { ascending: false });
    for (const m of msgs ?? []) {
      if (!lastMessages.has(m.conversation_id) && m.text) {
        lastMessages.set(m.conversation_id, m.text);
      }
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Ventas WhatsApp</h1>
      <p className="mt-2 text-sm text-muted">
        Conversaciones del bot vendedor (WhatsApp Cloud API). Mismo motor que Messenger — sin CRM
        completo.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs text-muted">Hoy</dt>
          <dd className="text-2xl font-bold">{todayCount}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs text-muted">Interesados</dt>
          <dd className="text-2xl font-bold">{interested}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs text-muted">Checkout enviado</dt>
          <dd className="text-2xl font-bold">{checkoutSent}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs text-muted">Compras</dt>
          <dd className="text-2xl font-bold">{purchased}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <dt className="text-xs text-muted">Necesitan atención</dt>
          <dd className="text-2xl font-bold text-amber-600">{needsAttention}</dd>
        </div>
      </dl>

      <div className="mt-10 overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Handoff</th>
              <th className="px-4 py-3">Último mensaje</th>
              <th className="px-4 py-3">Última interacción</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">
                  {maskExternalUserId(row.external_user_id)}
                </td>
                <td className="px-4 py-3">{row.state}</td>
                <td className="px-4 py-3">{row.handoff_requested ? "Sí" : "—"}</td>
                <td className="max-w-xs truncate px-4 py-3 text-muted">
                  {lastMessages.get(row.id) ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(row.last_message_at).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  {row.state !== "closed" && (
                    <CloseConversationButton
                      conversationId={row.id}
                      channel="whatsapp_business"
                    />
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Sin conversaciones todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
