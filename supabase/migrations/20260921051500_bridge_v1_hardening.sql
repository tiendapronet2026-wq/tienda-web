-- Puente v1: no declarar circuito validado antes del E2E remoto (corrige seed anticipado en prod).

update public.bridge_projects
set circuit_validated = false,
    updated_at = now()
where slug = 'tiendapro'
  and supabase_project_ref = 'dnptsudsxrcamtxfiszh';
