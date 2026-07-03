-- =============================================================================
-- Fase 10: Políticas RLS seguras
-- =============================================================================

-- Profiles
drop policy if exists "Perfiles: lectura propia" on public.profiles;
drop policy if exists "Perfiles: actualización propia" on public.profiles;
drop policy if exists "Perfiles: admin lectura" on public.profiles;

create policy "Perfiles: lectura propia"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Perfiles: actualización propia"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );

-- Categories
drop policy if exists "Categorías visibles para todos" on public.categories;

create policy "Categorías activas públicas"
  on public.categories for select
  using (is_active = true);

create policy "Categorías admin lectura"
  on public.categories for select to authenticated
  using (public.is_admin());

create policy "Categorías admin escritura"
  on public.categories for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Products
drop policy if exists "Productos activos visibles para todos" on public.products;

create policy "Productos activos públicos"
  on public.products for select
  using (is_active = true);

create policy "Productos admin lectura"
  on public.products for select to authenticated
  using (public.is_admin());

create policy "Productos admin escritura"
  on public.products for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Cart items: acceso restringido
drop policy if exists "Ver items del propio carrito" on public.cart_items;
drop policy if exists "Agregar items al carrito" on public.cart_items;
drop policy if exists "Actualizar items del carrito" on public.cart_items;
drop policy if exists "Eliminar items del carrito" on public.cart_items;

create policy "Carrito: usuario autenticado"
  on public.cart_items for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sin acceso directo para anon (el carrito anónimo se maneja vía service role en servidor)
create policy "Carrito: sin acceso anon directo"
  on public.cart_items for all to anon
  using (false)
  with check (false);

-- Inventory
create policy "Inventario admin"
  on public.inventory_movements for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
