-- Gate 1: fundación de costos — conversión determinista, historial enriquecido, idempotencia opcional.
-- Aditivo sobre tablas existentes; no duplica dominio de costos.

comment on column public.materials.unit_type is
  'Unidad base del material. materials.current_cost es siempre costo por esta unidad (ej. hoja, gramo).';

comment on column public.supplier_materials.unit_conversion_factor is
  'Cantidad de unidades base (materials.unit_type) incluidas en una presentación de compra (purchase_unit).';

alter table public.suppliers
  add column if not exists default_currency text
  check (default_currency is null or char_length(default_currency) = 3);

alter table public.material_cost_history
  add column if not exists purchase_price numeric(14,4)
    check (purchase_price is null or purchase_price >= 0);

alter table public.material_cost_history
  add column if not exists unit_conversion_factor numeric(14,6)
    check (unit_conversion_factor is null or unit_conversion_factor > 0);

alter table public.material_cost_history
  add column if not exists idempotency_key text
    check (idempotency_key is null or char_length(trim(idempotency_key)) between 1 and 120);

create unique index if not exists material_cost_history_idempotency_idx
  on public.material_cost_history (material_id, idempotency_key)
  where idempotency_key is not null;

-- Conversión determinista: precio de presentación / unidades base por presentación.
create or replace function public.compute_material_unit_cost(
  p_purchase_price numeric,
  p_units_per_purchase numeric
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_purchase_price is null or p_purchase_price < 0 then
    raise exception 'Precio de compra inválido';
  end if;
  if p_units_per_purchase is null or p_units_per_purchase <= 0 then
    raise exception 'Unidades por presentación inválidas';
  end if;
  return round(p_purchase_price / p_units_per_purchase, 4);
end;
$$;

revoke all on function public.compute_material_unit_cost(numeric, numeric) from public;
grant execute on function public.compute_material_unit_cost(numeric, numeric) to authenticated;

drop function if exists public.update_material_cost(uuid, numeric, uuid, text, numeric, text, text, text, date);

create or replace function public.update_material_cost(
  p_material_id uuid,
  p_new_cost numeric default null,
  p_supplier_id uuid default null,
  p_currency text default 'ARS',
  p_quantity_purchased numeric default null,
  p_purchase_unit text default null,
  p_reference text default null,
  p_notes text default null,
  p_effective_date date default current_date,
  p_purchase_price numeric default null,
  p_unit_conversion_factor numeric default null,
  p_idempotency_key text default null
)
returns public.materials
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material public.materials;
  v_old_cost numeric;
  v_unit_cost numeric;
  v_factor numeric;
  v_existing_history_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  if p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0 then
    select id into v_existing_history_id
    from public.material_cost_history
    where material_id = p_material_id
      and idempotency_key = trim(p_idempotency_key)
    limit 1;
    if found then
      select * into v_material from public.materials where id = p_material_id;
      if not found then raise exception 'Material no encontrado'; end if;
      return v_material;
    end if;
  end if;

  v_factor := coalesce(p_unit_conversion_factor, p_quantity_purchased);

  if p_supplier_id is not null and (v_factor is null or v_factor <= 0) then
    select sm.unit_conversion_factor into v_factor
    from public.supplier_materials sm
    where sm.material_id = p_material_id and sm.supplier_id = p_supplier_id
    limit 1;
  end if;

  if p_purchase_price is not null then
    if v_factor is null or v_factor <= 0 then
      raise exception 'Indicá unidades por presentación o factor de conversión';
    end if;
    v_unit_cost := public.compute_material_unit_cost(p_purchase_price, v_factor);
  elsif p_new_cost is not null and p_new_cost >= 0 then
    v_unit_cost := round(p_new_cost, 4);
    v_factor := coalesce(v_factor, 1);
  else
    raise exception 'Indicá precio de compra o costo unitario';
  end if;

  select * into v_material from public.materials
  where id = p_material_id for update;
  if not found then raise exception 'Material no encontrado'; end if;
  v_old_cost := v_material.current_cost;

  insert into public.material_cost_history (
    material_id, supplier_id, previous_cost, new_cost, currency,
    quantity_purchased, purchase_unit, reference, notes, effective_date, created_by,
    purchase_price, unit_conversion_factor, idempotency_key
  ) values (
    p_material_id, p_supplier_id, v_old_cost, v_unit_cost, upper(coalesce(p_currency, 'ARS')),
    v_factor, p_purchase_unit, p_reference, p_notes,
    coalesce(p_effective_date, current_date), auth.uid(),
    p_purchase_price, v_factor,
    case when p_idempotency_key is not null and char_length(trim(p_idempotency_key)) > 0
      then trim(p_idempotency_key) else null end
  );

  update public.materials
  set current_cost = v_unit_cost,
      currency = upper(coalesce(p_currency, 'ARS')),
      last_cost_update = now(),
      preferred_supplier_id = coalesce(p_supplier_id, preferred_supplier_id),
      updated_by = auth.uid()
  where id = p_material_id
  returning * into v_material;

  if p_supplier_id is not null then
    update public.supplier_materials set is_preferred = false
    where material_id = p_material_id and supplier_id <> p_supplier_id;

    insert into public.supplier_materials (
      supplier_id, material_id, latest_purchase_price, currency, purchase_unit,
      unit_conversion_factor, is_preferred
    ) values (
      p_supplier_id, p_material_id,
      coalesce(p_purchase_price, v_unit_cost),
      upper(coalesce(p_currency, 'ARS')),
      p_purchase_unit, v_factor, true
    )
    on conflict (supplier_id, material_id) do update
    set latest_purchase_price = coalesce(excluded.latest_purchase_price, public.supplier_materials.latest_purchase_price),
        currency = excluded.currency,
        purchase_unit = coalesce(excluded.purchase_unit, public.supplier_materials.purchase_unit),
        unit_conversion_factor = excluded.unit_conversion_factor,
        is_preferred = true,
        updated_at = now();
  end if;

  insert into public.cost_audit_log (
    entity_type, entity_id, action, old_values, new_values, user_id
  ) values (
    'material', p_material_id, 'cost_updated',
    jsonb_build_object('current_cost', v_old_cost),
    jsonb_build_object(
      'current_cost', v_unit_cost,
      'currency', upper(coalesce(p_currency, 'ARS')),
      'supplier_id', p_supplier_id,
      'purchase_price', p_purchase_price,
      'unit_conversion_factor', v_factor
    ),
    auth.uid()
  );

  return v_material;
end;
$$;

revoke all on function public.update_material_cost(
  uuid, numeric, uuid, text, numeric, text, text, text, date, numeric, numeric, text
) from public;
revoke all on function public.update_material_cost(
  uuid, numeric, uuid, text, numeric, text, text, text, date, numeric, numeric, text
) from anon;
grant execute on function public.update_material_cost(
  uuid, numeric, uuid, text, numeric, text, text, text, date, numeric, numeric, text
) to authenticated;

-- Autoprueba determinista (sin datos de negocio).
do $$
declare
  v_paper numeric;
  v_filament numeric;
begin
  v_paper := public.compute_material_unit_cost(10000, 500);
  if v_paper <> 20 then
    raise exception 'Gate1 self-check papel: esperado 20, obtuvo %', v_paper;
  end if;
  v_filament := public.compute_material_unit_cost(20000, 1000);
  if v_filament <> 20 then
    raise exception 'Gate1 self-check filamento: esperado 20, obtuvo %', v_filament;
  end if;
end;
$$;
