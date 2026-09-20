-- Idempotencia checkout (evitar doble pedido por doble submit)
alter table public.orders
  add column if not exists checkout_idempotency_key text;

create unique index if not exists orders_checkout_idempotency_key_idx
  on public.orders (checkout_idempotency_key)
  where checkout_idempotency_key is not null;

-- Clientes autenticados pueden crear su propio pedido vía server (RLS); admin mantiene gestión completa
drop policy if exists "Pedidos propios insert" on public.orders;
create policy "Pedidos propios insert"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Items pedido propios insert" on public.order_items;
create policy "Items pedido propios insert"
  on public.order_items for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

grant insert on public.orders to authenticated;
grant insert on public.order_items to authenticated;
