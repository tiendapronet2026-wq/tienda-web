-- Branding runtime completo para instalación de referencia TiendaPro (sin secretos).
update public.platform_installations
set branding_config = jsonb_build_object(
  'brandName', 'TiendaPro',
  'tagline', 'Plataforma comercial y operaciones',
  'logoUrl', '/brand/icons/logo-tiendapro-icon.png',
  'faviconUrl', '/brand/icons/favicon-32.png',
  'primaryColor', '#0a8f5c',
  'secondaryColor', '#0860e8',
  'fontFamily', 'var(--font-plus-jakarta)',
  'contactEmail', 'hola@tiendapro.net',
  'platformMode', true
),
updated_at = now()
where company_slug = 'tiendapro-reference';
