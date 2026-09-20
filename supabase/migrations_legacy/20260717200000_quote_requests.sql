-- =============================================================================
-- Cotizaciones: quote_requests + quote_attachments + storage privado
-- Migración aditiva: no elimina tablas ni columnas existentes.
-- No afecta productos, pedidos, inventario ni usuarios.
-- =============================================================================

create sequence if not exists public.quote_request_number_seq;

create or replace function public.generate_quote_number()
returns text
language plpgsql
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('public.quote_request_number_seq');
  return 'TP-Q-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || lpad(seq_val::text, 4, '0');
end;
$$;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique default public.generate_quote_number(),
  user_id uuid references auth.users(id) on delete set null,
  service_type text not null check (service_type in (
    'impresion-papel',
    'impresion-3d',
    'grabado-laser',
    'corte-polifan',
    'personalizado'
  )),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 5 and 254),
  phone text check (phone is null or char_length(trim(phone)) between 6 and 40),
  company_name text check (company_name is null or char_length(trim(company_name)) <= 160),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  quantity integer check (quantity is null or (quantity > 0 and quantity <= 100000)),
  width_mm numeric(12, 2) check (width_mm is null or (width_mm > 0 and width_mm <= 100000)),
  height_mm numeric(12, 2) check (height_mm is null or (height_mm > 0 and height_mm <= 100000)),
  depth_mm numeric(12, 2) check (depth_mm is null or (depth_mm > 0 and depth_mm <= 100000)),
  material text check (material is null or char_length(trim(material)) <= 160),
  color text check (color is null or char_length(trim(color)) <= 120),
  deadline_date date,
  print_color_mode text check (print_color_mode is null or print_color_mode in ('color', 'bn')),
  print_sides text check (print_sides is null or print_sides in ('simple', 'doble')),
  paper_type text check (paper_type is null or char_length(trim(paper_type)) <= 120),
  finish text check (finish is null or char_length(trim(finish)) <= 160),
  detail_level text check (detail_level is null or detail_level in ('basico', 'medio', 'alto')),
  engraving_area text check (engraving_area is null or char_length(trim(engraving_area)) <= 240),
  design_text text check (design_text is null or char_length(trim(design_text)) <= 2000),
  figure_type text check (figure_type is null or char_length(trim(figure_type)) <= 160),
  status text not null default 'new' check (status in (
    'new',
    'reviewing',
    'information_requested',
    'quoted',
    'accepted',
    'rejected',
    'cancelled',
    'completed'
  )),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 5000),
  privacy_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_requests_status_idx on public.quote_requests(status);
create index if not exists quote_requests_created_at_idx on public.quote_requests(created_at desc);
create index if not exists quote_requests_user_id_idx on public.quote_requests(user_id);
create index if not exists quote_requests_email_idx on public.quote_requests(lower(email));
create index if not exists quote_requests_service_type_idx on public.quote_requests(service_type);
create index if not exists quote_requests_quote_number_idx on public.quote_requests(quote_number);

drop trigger if exists quote_requests_updated_at on public.quote_requests;
create trigger quote_requests_updated_at
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

create table if not exists public.quote_attachments (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
  storage_path text not null,
  original_filename text not null check (char_length(trim(original_filename)) between 1 and 255),
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 15728640),
  created_at timestamptz not null default now()
);

create index if not exists quote_attachments_quote_request_id_idx
  on public.quote_attachments(quote_request_id);

alter table public.quote_requests enable row level security;
alter table public.quote_attachments enable row level security;

-- Lectura: admin todo; cliente autenticado solo las propias
drop policy if exists "Cotizaciones: lectura propia o admin" on public.quote_requests;
create policy "Cotizaciones: lectura propia o admin"
  on public.quote_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Escritura/actualización solo admin (inserción pública vía service role en servidor)
drop policy if exists "Cotizaciones: admin escritura" on public.quote_requests;
create policy "Cotizaciones: admin escritura"
  on public.quote_requests for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Cotizaciones: sin acceso anon" on public.quote_requests;
create policy "Cotizaciones: sin acceso anon"
  on public.quote_requests for all to anon
  using (false)
  with check (false);

drop policy if exists "Adjuntos cotización: lectura propia o admin" on public.quote_attachments;
create policy "Adjuntos cotización: lectura propia o admin"
  on public.quote_attachments for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.quote_requests q
      where q.id = quote_request_id
        and q.user_id = auth.uid()
    )
  );

drop policy if exists "Adjuntos cotización: admin escritura" on public.quote_attachments;
create policy "Adjuntos cotización: admin escritura"
  on public.quote_attachments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Adjuntos cotización: sin acceso anon" on public.quote_attachments;
create policy "Adjuntos cotización: sin acceso anon"
  on public.quote_attachments for all to anon
  using (false)
  with check (false);

-- Bucket privado para adjuntos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-attachments',
  'quote-attachments',
  false,
  15728640,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'image/svg+xml',
    'model/stl',
    'application/sla',
    'model/obj',
    'text/plain',
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sin políticas de lectura/escritura pública: acceso solo vía service role (URLs firmadas)
drop policy if exists "Adjuntos cotización storage lectura" on storage.objects;
drop policy if exists "Adjuntos cotización storage escritura" on storage.objects;
drop policy if exists "Adjuntos cotización storage actualización" on storage.objects;
drop policy if exists "Adjuntos cotización storage eliminación" on storage.objects;

revoke all on function public.generate_quote_number() from public;
grant execute on function public.generate_quote_number() to service_role;
grant usage, select on sequence public.quote_request_number_seq to service_role;

grant select on public.quote_requests to authenticated;
grant all on public.quote_requests to service_role;
grant select on public.quote_attachments to authenticated;
grant all on public.quote_attachments to service_role;

-- Admin updates via authenticated + is_admin() policies
grant update on public.quote_requests to authenticated;
