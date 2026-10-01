-- Gate 2A hardening: calculate_product_material_cost es SECURITY DEFINER y debe exigir admin
-- (mismo patrón que update_material_cost). Sin esto, authenticated no-admin obtiene el roll-up.

create or replace function public.calculate_product_material_cost(p_product_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado';
  end if;

  return (
    select coalesce(
      round(
        sum(b.quantity * m.current_cost)::numeric,
        4
      ),
      0
    )
    from public.product_bom_lines b
    inner join public.materials m on m.id = b.material_id
    where b.product_id = p_product_id
      and b.is_active
      and b.product_variant_id is null
      and m.is_active
      and m.current_cost >= 0
  );
end;
$$;

comment on function public.calculate_product_material_cost(uuid) is
  'SUM(cantidad × materials.current_cost) solo líneas BOM activas y materiales activos. Solo admin (is_admin).';
