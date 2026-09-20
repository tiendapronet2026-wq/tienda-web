-- Admin comercial tienda (no cuentas Preview): email documentado en admin_notes.
-- Idempotente: puede ejecutarse antes de que exista el usuario Auth.
update public.profiles
set role = 'admin', updated_at = now()
where id in (
  select id from auth.users
  where lower(email) = lower('tiendapro.net.2026@gmail.com')
)
and role is distinct from 'admin';

-- Si el perfil aún no existe (usuario creado después), reintentar tras trigger handle_new_user:
insert into public.profiles (id, first_name, last_name, role, status)
select id,
  coalesce(raw_user_meta_data->>'first_name', 'TiendaPro'),
  coalesce(raw_user_meta_data->>'last_name', 'Comercial'),
  'admin',
  'active'
from auth.users
where lower(email) = lower('tiendapro.net.2026@gmail.com')
on conflict (id) do update
set role = 'admin', updated_at = now()
where public.profiles.role is distinct from 'admin';
