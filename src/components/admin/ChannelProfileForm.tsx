"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { createChannelProfile, updateChannelProfile } from "@/app/admin/actions/channel-profiles";

export type ChannelProfileRow = {
  id: string;
  name: string;
  code: string | null;
  channel_fee_percent: number;
  payment_fee_percent: number;
  fixed_fee_per_order: number;
  shipping_absorbed_per_order: number;
  other_cost_per_order: number;
  default_units_per_order: number;
  target_channel_margin_percent: number | null;
  is_active: boolean;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Guardando…" : label}
    </button>
  );
}

function ProfileFields({ profile }: { profile?: ChannelProfileRow }) {
  return (
    <>
      {profile && <input type="hidden" name="id" value={profile.id} />}
      <label className="block text-sm font-medium">
        Nombre
        <input
          name="name"
          required
          defaultValue={profile?.name ?? ""}
          className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium">
        Código (opcional)
        <input
          name="code"
          defaultValue={profile?.code ?? ""}
          className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Comisión canal (%)
          <input
            name="channel_fee_percent"
            type="number"
            step="0.01"
            min="0"
            max="99.99"
            defaultValue={profile?.channel_fee_percent ?? 0}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Comisión cobro (%)
          <input
            name="payment_fee_percent"
            type="number"
            step="0.01"
            min="0"
            max="99.99"
            defaultValue={profile?.payment_fee_percent ?? 0}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Cargo fijo por pedido
          <input
            name="fixed_fee_per_order"
            type="number"
            step="0.01"
            min="0"
            defaultValue={profile?.fixed_fee_per_order ?? 0}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Envío absorbido por pedido
          <input
            name="shipping_absorbed_per_order"
            type="number"
            step="0.01"
            min="0"
            defaultValue={profile?.shipping_absorbed_per_order ?? 0}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Otros costos por pedido
          <span className="ml-1 text-xs font-normal text-muted">
            (solo costos reales no modelados en otro campo)
          </span>
          <input
            name="other_cost_per_order"
            type="number"
            step="0.01"
            min="0"
            defaultValue={profile?.other_cost_per_order ?? 0}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Unidades promedio por pedido
          <input
            name="default_units_per_order"
            type="number"
            step="0.0001"
            min="0.0001"
            defaultValue={profile?.default_units_per_order ?? 1}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium sm:col-span-2">
          Margen de contribución objetivo por defecto (%)
          <span className="ml-1 text-xs font-normal text-muted">
            (sobre venta neta, después de producción y costos de este perfil — no es margen Gate 3A)
          </span>
          <input
            name="target_channel_margin_percent"
            type="number"
            step="0.01"
            min="0"
            max="99.99"
            defaultValue={profile?.target_channel_margin_percent ?? ""}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={profile?.is_active ?? true}
            className="rounded border-border"
          />
          Activo
        </label>
      </div>
    </>
  );
}

type ProfileActionResult = { error?: string; success?: string } | null;

export function CreateChannelProfileForm({
  action,
}: {
  action: typeof createChannelProfile;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ProfileActionResult, formData: FormData) => action(formData),
    null as ProfileActionResult,
  );
  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Nuevo perfil</h2>
      <ProfileFields />
      {state?.error && <p className="text-sm text-error">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand">{state.success}</p>}
      <Submit label="Crear perfil" />
    </form>
  );
}

export function EditChannelProfileForm({
  profile,
  action,
}: {
  profile: ChannelProfileRow;
  action: typeof updateChannelProfile;
}) {
  const [state, formAction] = useActionState(
    async (_prev: ProfileActionResult, formData: FormData) => action(formData),
    null as ProfileActionResult,
  );
  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-xl border border-border bg-muted/20 p-5">
      <h3 className="font-semibold">{profile.name}</h3>
      <ProfileFields profile={profile} />
      {state?.error && <p className="text-sm text-error">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand">{state.success}</p>}
      <Submit label="Guardar cambios" />
    </form>
  );
}
