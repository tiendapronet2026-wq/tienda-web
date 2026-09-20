-- Privilegios de tabla (baseline revocó defaults; RLS sigue aplicando filas visibles)
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;

grant select, insert, update, delete on public.cart_items to authenticated;
-- Carrito anónimo vía service_role en servidor (bypass RLS)

grant select, insert, update, delete on public.quote_requests to anon, authenticated;
grant select on public.quote_attachments to authenticated;

-- Admin / cuenta (RLS restringe filas)
grant select, update on public.profiles to authenticated;

-- Pedidos cuenta propia (RLS)
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.customer_addresses to authenticated;
grant insert, update on public.customer_addresses to authenticated;

-- Costos e inventario: solo authenticated; RLS admin
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.materials to authenticated;
grant select, insert, update, delete on public.material_categories to authenticated;
grant select, insert, update, delete on public.supplier_materials to authenticated;
grant select, insert, update, delete on public.material_cost_history to authenticated;
grant select, insert, update, delete on public.machines to authenticated;
grant select, insert, update, delete on public.labor_rates to authenticated;
grant select, insert, update, delete on public.business_cost_settings to authenticated;
grant select, insert on public.cost_audit_log to authenticated;
grant select, insert on public.inventory_movements to authenticated;

grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.quote_attachments to authenticated;
