import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  CreateChannelProfileForm,
  EditChannelProfileForm,
  type ChannelProfileRow,
} from "@/components/admin/ChannelProfileForm";
import { createChannelProfile, updateChannelProfile } from "@/app/admin/actions/channel-profiles";

export default async function ChannelProfilesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("channel_cost_profiles")
    .select("*")
    .order("name");

  const profiles: ChannelProfileRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    channel_fee_percent: Number(r.channel_fee_percent),
    payment_fee_percent: Number(r.payment_fee_percent),
    fixed_fee_per_order: Number(r.fixed_fee_per_order),
    shipping_absorbed_per_order: Number(r.shipping_absorbed_per_order),
    other_cost_per_order: Number(r.other_cost_per_order),
    default_units_per_order: Number(r.default_units_per_order),
    is_active: r.is_active,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Perfiles de rentabilidad</h1>
      <p className="mt-2 mb-8 max-w-3xl text-text-secondary">
        Cada perfil modela un escenario económico completo (canal + medio de cobro + costos por
        pedido). Los porcentajes se aplican sobre el precio final cobrado. Configurá valores reales
        manualmente; no hay integración con proveedores en este gate.
      </p>

      <CreateChannelProfileForm action={createChannelProfile} />

      <div className="mt-10 space-y-6">
        <h2 className="text-xl font-semibold">Perfiles existentes</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay perfiles.</p>
        ) : (
          profiles.map((profile) => (
            <EditChannelProfileForm
              key={profile.id}
              profile={profile}
              action={updateChannelProfile}
            />
          ))
        )}
      </div>
    </div>
  );
}
