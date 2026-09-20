-- Operador Control para admin comercial existente (lectura/escritura instalaciones vía RLS owner)
insert into public.control_operators (user_id, role)
select id, 'owner'
from auth.users
where email = 'tiendapro.net.2026@gmail.com'
on conflict (user_id) do update set role = excluded.role;
