-- Pruebas RLS: dos tenants, escalamiento de permisos
\set ON_ERROR_STOP on

-- IDs fijos
\set user_alpha '11111111-1111-1111-1111-111111111111'
\set user_beta '22222222-2222-2222-2222-222222222222'
\set user_owner '33333333-3333-3333-3333-333333333333'
\set user_viewer '44444444-4444-4444-4444-444444444444'

insert into auth.users (id, raw_user_meta_data) values
  (:'user_alpha'::uuid, '{"first_name":"Alpha"}'),
  (:'user_beta'::uuid, '{"first_name":"Beta"}'),
  (:'user_owner'::uuid, '{"first_name":"Owner"}'),
  (:'user_viewer'::uuid, '{"first_name":"Viewer"}')
on conflict (id) do nothing;

insert into public.control_operators (user_id, role) values
  (:'user_owner'::uuid, 'owner'),
  (:'user_viewer'::uuid, 'viewer')
on conflict (user_id) do update set role = excluded.role;

do $$
declare
  t_alpha uuid;
  t_beta uuid;
begin
  select id into t_alpha from public.tenants where slug = 'tenant-alpha-test';
  select id into t_beta from public.tenants where slug = 'tenant-beta-test';

  insert into public.tenant_memberships (tenant_id, user_id, role, status) values
    (t_alpha, '11111111-1111-1111-1111-111111111111'::uuid, 'admin', 'active'),
    (t_beta, '22222222-2222-2222-2222-222222222222'::uuid, 'admin', 'active')
  on conflict (tenant_id, user_id) do nothing;
end $$;

-- Helper: impersonate JWT sub
create or replace function test_set_auth(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  execute 'set local role authenticated';
end;
$$;

-- 1) Alpha lee módulos de alpha OK, beta invisible (count 0 cross-tenant)
do $$
declare
  t_alpha uuid;
  t_beta uuid;
  n_alpha int;
  n_beta int;
begin
  select id into t_alpha from public.tenants where slug = 'tenant-alpha-test';
  select id into t_beta from public.tenants where slug = 'tenant-beta-test';

  perform test_set_auth('11111111-1111-1111-1111-111111111111'::uuid);
  select count(*) into n_alpha from public.tenant_module_activations where tenant_id = t_alpha;
  select count(*) into n_beta from public.tenant_module_activations where tenant_id = t_beta;

  if n_alpha < 1 then
    raise exception 'FAIL alpha should see own modules, got %', n_alpha;
  end if;
  if n_beta <> 0 then
    raise exception 'FAIL alpha must not see beta modules, got %', n_beta;
  end if;
end $$;

-- 2) Admin tenant no puede activar módulo (write bloqueado por RLS)
do $$
declare
  t_beta uuid;
  blocked boolean := false;
begin
  select id into t_beta from public.tenants where slug = 'tenant-beta-test';
  perform test_set_auth('22222222-2222-2222-2222-222222222222'::uuid);

  begin
    insert into public.tenant_module_activations (tenant_id, module_id, state, activated_at)
    values (t_beta, 'finanzas', 'active', now());
  exception
    when others then
      blocked := true;
  end;

  if not blocked then
    raise exception 'FAIL tenant admin must not insert module activation';
  end if;
end $$;

-- 3) Control owner puede insertar activación (licencias)
do $$
declare
  t_beta uuid;
  before_n int;
  after_n int;
begin
  select id into t_beta from public.tenants where slug = 'tenant-beta-test';
  perform test_set_auth('33333333-3333-3333-3333-333333333333'::uuid);

  select count(*) into before_n from public.tenant_module_activations
    where tenant_id = t_beta and module_id = 'stock';

  insert into public.tenant_module_activations (tenant_id, module_id, state, activated_at)
  values (t_beta, 'stock', 'active', now())
  on conflict (tenant_id, module_id) do update set state = excluded.state;

  select count(*) into after_n from public.tenant_module_activations
    where tenant_id = t_beta and module_id = 'stock' and state = 'active';

  if after_n <> 1 then
    raise exception 'FAIL control owner should activate module';
  end if;
end $$;

-- 4) Usuario no puede escalar role en profiles
do $$
begin
  perform test_set_auth('11111111-1111-1111-1111-111111111111'::uuid);

  begin
    update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111'::uuid;
    raise exception 'FAIL profile role escalation should be blocked';
  exception
    when others then
      if sqlerrm not like '%privileged fields%' and sqlerrm not like '%violates row-level security%' then
        raise;
      end if;
  end;

  update public.profiles set first_name = 'AlphaUpdated' where id = '11111111-1111-1111-1111-111111111111'::uuid;
  if (select first_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'::uuid) <> 'AlphaUpdated' then
    raise exception 'FAIL self update of first_name should succeed';
  end if;
end $$;

-- 5) Operador Control viewer no puede elevar role en profiles ajenos
do $$
declare
  role_before text;
  role_after text;
begin
  select role into role_before from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'::uuid;

  perform test_set_auth('44444444-4444-4444-4444-444444444444'::uuid);
  update public.profiles
    set role = 'admin'
    where id = '11111111-1111-1111-1111-111111111111'::uuid;

  reset role;
  select role into role_after from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'::uuid;

  if role_after is distinct from role_before or role_after = 'admin' then
    raise exception 'FAIL control viewer must not change profile role (before %, after %)', role_before, role_after;
  end if;

  perform test_set_auth('44444444-4444-4444-4444-444444444444'::uuid);
  begin
    update public.profiles set role = 'admin' where id = '44444444-4444-4444-4444-444444444444'::uuid;
  exception
    when others then null;
  end;
  reset role;
  if (select role from public.profiles where id = '44444444-4444-4444-4444-444444444444'::uuid) <> 'customer' then
    raise exception 'FAIL control viewer must not escalate own profile role';
  end if;
end $$;

-- 6) Tabla futura sin grant explícito: anon no tiene SELECT
do $$
declare
  can_anon_select boolean;
begin
  create table if not exists public.future_probe (
    id uuid primary key default gen_random_uuid(),
    note text not null default 'probe'
  );
  alter table public.future_probe enable row level security;

  select has_table_privilege('anon', 'public.future_probe', 'SELECT') into can_anon_select;

  if can_anon_select then
    raise exception 'FAIL anon must not have SELECT on future table by default';
  end if;

  begin
    execute 'set role anon';
    perform 1 from public.future_probe limit 1;
    raise exception 'FAIL anon should not read future_probe';
  exception
    when insufficient_privilege then null;
    when others then
      if sqlerrm not like '%permission denied%' then
        raise;
      end if;
  end;

  reset role;
end $$;

reset role;
select 'RLS isolated tests passed' as result;
