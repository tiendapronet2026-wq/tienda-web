-- =============================================================================
-- Fase 8: Storage para imágenes de productos
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública
drop policy if exists "Imágenes públicas lectura" on storage.objects;
create policy "Imágenes públicas lectura"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Escritura solo admin
drop policy if exists "Imágenes admin escritura" on storage.objects;
create policy "Imágenes admin escritura"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Imágenes admin actualización" on storage.objects;
create policy "Imágenes admin actualización"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Imágenes admin eliminación" on storage.objects;
create policy "Imágenes admin eliminación"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
