-- Fusión transaccional de carrito anónimo al autenticarse
create or replace function public.merge_anonymous_cart(
  p_session_id text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_existing_id uuid;
  v_existing_qty integer;
begin
  if p_session_id is null or p_user_id is null then
    return;
  end if;

  for v_item in
    select id, product_id, quantity
    from public.cart_items
    where session_id = p_session_id
      and user_id is null
    for update
  loop
    select id, quantity
    into v_existing_id, v_existing_qty
    from public.cart_items
    where user_id = p_user_id
      and product_id = v_item.product_id
    for update;

    if found then
      update public.cart_items
      set quantity = least(v_existing_qty + v_item.quantity, 99)
      where id = v_existing_id;

      delete from public.cart_items where id = v_item.id;
    else
      update public.cart_items
      set user_id = p_user_id
      where id = v_item.id;
    end if;
  end loop;
end;
$$;

revoke all on function public.merge_anonymous_cart(text, uuid) from public;
grant execute on function public.merge_anonymous_cart(text, uuid) to service_role;

-- Endurecer search_path en funciones sensibles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'customer',
    'active'
  );
  return new;
end;
$$;

-- Impedir inserción directa de perfiles por usuarios
drop policy if exists "Perfiles: inserción restringida" on public.profiles;
create policy "Perfiles: inserción restringida"
  on public.profiles for insert to authenticated
  with check (false);

-- Usuarios suspendidos: solo lectura de su perfil, sin actualización
drop policy if exists "Perfiles: actualización propia" on public.profiles;
create policy "Perfiles: actualización propia"
  on public.profiles for update to authenticated
  using (id = auth.uid() and status = 'active')
  with check (
    id = auth.uid()
    and status = 'active'
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Límite de cantidad en carrito a nivel de base de datos
alter table public.cart_items
  drop constraint if exists cart_items_quantity_check;

alter table public.cart_items
  add constraint cart_items_quantity_check
  check (quantity > 0 and quantity <= 99);
