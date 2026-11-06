-- Blu V1 — Aislamiento de datos entre personas (BLU-104, specs/009-v1-isolation-rls).
-- Requiere el esquema auth de Supabase (auth.users, auth.uid()).
--
-- Reglas transversales (specs/009):
--   1. Sin política de servicio con bypass: las clientas usan solo la clave anónima + sesión.
--      La clave service_role NUNCA se usa en el cliente ni en políticas; queda exclusivamente
--      en funciones administrativas auditadas del servidor.
--   2. evidence_sources es catálogo de solo lectura para usuarias autenticadas; la escritura
--      es solo del rol reviewer (BLU-1302).
--   3. Borrado (ARCO): borrado lógico con deleted_at + purga diferida; no existe DELETE
--      desde el rol autenticado (política no_delete using (false)).

create extension if not exists pgcrypto; -- gen_random_uuid()

-- Rol de revisión científica; se crea idempotente para entornos que ya lo tengan.
-- Convención Supabase para roles custom: el rol se apila sobre authenticated,
-- de modo que quien revisa también es usuaria autenticada (lee el catálogo que
-- actualiza; sin esto, un UPDATE ... WHERE queda sin visibilidad de filas con RLS).
do $$
begin
  if not exists (select from pg_roles where rolname = 'reviewer') then
    create role reviewer nologin inherit;
  end if;
end $$;
grant authenticated to reviewer;

-- ---------------------------------------------------------------------------
-- Tablas personales: toda fila lleva owner_id referenciando auth.users.
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  pseudonym text not null default '',
  timezone text not null default 'America/Santiago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  notice_version text not null,
  status text not null default 'granted' check (status in ('granted', 'withdrawn')),
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table habit_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  habit_id text not null,
  goal_version text not null,
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references habit_plans(id) on delete cascade,
  checked_on date not null,
  timezone text not null default 'America/Santiago',
  result text not null check (result in ('done', 'partial', 'skipped')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table adaptation_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references habit_plans(id) on delete cascade,
  previous_goal text,
  new_goal text not null,
  reason text not null,
  author text not null default 'person' check (author in ('person', 'assistant_suggestion')),
  applied_rule text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table goal_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Catálogo de evidencia científica: legible por autenticadas, editable solo por reviewer.
-- Sin owner_id: no es dato personal.
-- ---------------------------------------------------------------------------

create table evidence_sources (
  id uuid primary key default gen_random_uuid(),
  source_ref text not null,              -- DOI / PMID / URL estable
  source_type text not null default 'other',
  population text,
  design text,
  result_summary text,
  limitations text,
  bias_risk text,
  reviewed_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS owner-only (políticas del bosquejo ejecutable de specs/009).
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
create policy "owner_select" on profiles for select using (owner_id = auth.uid());
create policy "owner_insert" on profiles for insert with check (owner_id = auth.uid());
create policy "owner_update" on profiles for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on profiles for delete using (false);

alter table consent_records enable row level security;
create policy "owner_select" on consent_records for select using (owner_id = auth.uid());
create policy "owner_insert" on consent_records for insert with check (owner_id = auth.uid());
create policy "owner_update" on consent_records for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on consent_records for delete using (false);

alter table habit_plans enable row level security;
create policy "owner_select" on habit_plans for select using (owner_id = auth.uid());
create policy "owner_insert" on habit_plans for insert with check (owner_id = auth.uid());
create policy "owner_update" on habit_plans for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on habit_plans for delete using (false);

alter table check_ins enable row level security;
create policy "owner_select" on check_ins for select using (owner_id = auth.uid());
create policy "owner_insert" on check_ins for insert with check (owner_id = auth.uid());
create policy "owner_update" on check_ins for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on check_ins for delete using (false);

alter table adaptation_events enable row level security;
create policy "owner_select" on adaptation_events for select using (owner_id = auth.uid());
create policy "owner_insert" on adaptation_events for insert with check (owner_id = auth.uid());
create policy "owner_update" on adaptation_events for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on adaptation_events for delete using (false);

alter table reviews enable row level security;
create policy "owner_select" on reviews for select using (owner_id = auth.uid());
create policy "owner_insert" on reviews for insert with check (owner_id = auth.uid());
create policy "owner_update" on reviews for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on reviews for delete using (false);

alter table goal_decisions enable row level security;
create policy "owner_select" on goal_decisions for select using (owner_id = auth.uid());
create policy "owner_insert" on goal_decisions for insert with check (owner_id = auth.uid());
create policy "owner_update" on goal_decisions for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on goal_decisions for delete using (false);

alter table evidence_sources enable row level security;
create policy "catalog_select" on evidence_sources for select to authenticated using (true);
create policy "reviewer_insert" on evidence_sources for insert to reviewer with check (true);
create policy "reviewer_update" on evidence_sources for update to reviewer using (true) with check (true);
create policy "no_delete" on evidence_sources for delete using (false);

-- ---------------------------------------------------------------------------
-- Índices por owner: las consultas solo escanean filas de la persona.
-- ---------------------------------------------------------------------------

create index profiles_owner_idx on profiles (owner_id);
create index consent_records_owner_idx on consent_records (owner_id);
create index habit_plans_owner_idx on habit_plans (owner_id);
create index check_ins_owner_idx on check_ins (owner_id);
create index adaptation_events_owner_idx on adaptation_events (owner_id);
create index reviews_owner_idx on reviews (owner_id);
create index goal_decisions_owner_idx on goal_decisions (owner_id);

-- ---------------------------------------------------------------------------
-- Privilegios: el rol autenticado solo toca sus filas (RLS); reviewer escribe el catálogo.
-- service_role no recibe ningún privilegio ni política aquí.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update on profiles to authenticated;
grant select, insert, update on consent_records to authenticated;
grant select, insert, update on habit_plans to authenticated;
grant select, insert, update on check_ins to authenticated;
grant select, insert, update on adaptation_events to authenticated;
grant select, insert, update on reviews to authenticated;
grant select, insert, update on goal_decisions to authenticated;
grant select on evidence_sources to authenticated;
grant insert, update on evidence_sources to reviewer;
