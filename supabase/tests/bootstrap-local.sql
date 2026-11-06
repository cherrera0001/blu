-- Bootstrap local para ejecutar supabase/migrations/0001_owner_only.sql
-- fuera de Supabase (postgres:18-alpine). Reproduce lo mínimo del entorno
-- Supabase: esquema auth, auth.uid() desde request.jwt.claims, roles.
-- SOLO para pruebas; nunca se aplica a un proyecto real.

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);

create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

-- Roles que el entorno Supabase ya provee o que usa Blu.
do $$
begin
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'reviewer') then
    create role reviewer nologin inherit;
  end if;
end $$;

-- Usuarias de prueba: heredan los privilegios del rol de política.
drop role if exists blu_user_a;
drop role if exists blu_user_b;
drop role if exists blu_reviewer;
create role blu_user_a login password 'blu' inherit;
create role blu_user_b login password 'blu' inherit;
create role blu_reviewer login password 'blu' inherit;
grant authenticated to blu_user_a;
grant authenticated to blu_user_b;
grant reviewer to blu_reviewer;

-- Identidades semilla (las dos cuentas del DoR de BLU-104).
insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict do nothing;
