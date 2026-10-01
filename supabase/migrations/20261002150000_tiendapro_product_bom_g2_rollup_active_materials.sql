-- Alineación remoto: roll-up excluye materiales inactivos (evita costo engañoso).

create or replace function public.calculate_product_material_cost(p_product_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
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
    and m.current_cost >= 0;
$$;

comment on function public.calculate_product_material_cost(uuid) is
  'SUM(cantidad × materials.current_cost) solo para líneas BOM activas y materiales activos. Sin snapshot en BOM.';
