-- Promover usuario admin inicial por email (ejecutar manualmente tras registrarse)
-- UPDATE public.profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'tiendapro.net.2026@gmail.com');

comment on function public.is_admin() is 'Verifica rol admin en servidor; no confiar en el frontend.';
