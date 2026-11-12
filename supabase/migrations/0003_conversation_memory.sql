-- Blu V2 — Memoria conversacional consentida y minimizada (#43, ADR-0008 D-1).
-- Construida sobre V1 (auth + RLS owner-only). Apagada por configuración:
-- sin BLU_MEMORY_ENABLED=1 la app no lee ni escribe esta tabla.
--
-- Reglas:
--   1. Solo con consentimiento del propósito «memoria_conversacional» (lo aplica la app).
--   2. Retención máxima 30 días, fijada en la base: expires_at no puede superar
--      created_at + 30 días, y lo caducado no se devuelve.
--   3. Borrado verificable: memory_forget() marca todo lo de la dueña; la purga
--      física (service_role) elimina lo marcado y lo caducado sin espera.
--   4. Nada de esto se replica en logs, telemetría ni exportaciones de investigación.

create table conversation_memory (
  id uuid primary key default gen_random_uuid(),
  -- La clienta no envía owner_id: lo fija la base y RLS exige que coincida.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  deleted_at timestamptz,
  constraint memory_retention_max_30d check (expires_at <= created_at + interval '30 days')
);

create index conversation_memory_owner_idx on conversation_memory (owner_id, created_at);

alter table conversation_memory enable row level security;
-- Lo caducado o borrado no es visible ni para su dueña.
create policy "owner_select" on conversation_memory for select
  using (owner_id = auth.uid() and deleted_at is null and expires_at > now());
create policy "owner_insert" on conversation_memory for insert
  with check (owner_id = auth.uid() and deleted_at is null);
create policy "owner_update" on conversation_memory for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "no_delete" on conversation_memory for delete using (false);

-- ---------------------------------------------------------------------------
-- Olvido a pedido de la persona: marca todo lo suyo y devuelve cuántas filas.
-- ---------------------------------------------------------------------------
create or replace function memory_forget()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected integer;
begin
  update conversation_memory set deleted_at = now()
  where owner_id = auth.uid() and deleted_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- Purga física (administrativa, diaria): elimina lo marcado y lo caducado.
-- Para texto conversacional no hay retención diferida.
-- ---------------------------------------------------------------------------
create or replace function memory_purge()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  delete from conversation_memory where deleted_at is not null or expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function memory_forget() to authenticated;
revoke execute on function memory_purge() from public;
revoke execute on function memory_purge() from authenticated;
grant execute on function memory_purge() to service_role;

-- ---------------------------------------------------------------------------
-- ARCO: acceso incluye la memoria vigente; cancelación la marca junto al resto.
-- ---------------------------------------------------------------------------
create or replace function arco_access()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'profiles', coalesce((select jsonb_agg(p) from profiles p where p.owner_id = auth.uid()), '[]'::jsonb),
    'consent_records', coalesce((select jsonb_agg(c) from consent_records c where c.owner_id = auth.uid()), '[]'::jsonb),
    'habit_plans', coalesce((select jsonb_agg(h) from habit_plans h where h.owner_id = auth.uid()), '[]'::jsonb),
    'check_ins', coalesce((select jsonb_agg(ci) from check_ins ci where ci.owner_id = auth.uid()), '[]'::jsonb),
    'adaptation_events', coalesce((select jsonb_agg(a) from adaptation_events a where a.owner_id = auth.uid()), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(r) from reviews r where r.owner_id = auth.uid()), '[]'::jsonb),
    'goal_decisions', coalesce((select jsonb_agg(g) from goal_decisions g where g.owner_id = auth.uid()), '[]'::jsonb),
    'conversation_memory', coalesce((select jsonb_agg(m) from conversation_memory m where m.owner_id = auth.uid()), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function arco_cancel()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected integer;
begin
  with u1 as (update profiles set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u2 as (update consent_records set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u3 as (update habit_plans set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u4 as (update check_ins set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u5 as (update adaptation_events set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u6 as (update reviews set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u7 as (update goal_decisions set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1),
       u8 as (update conversation_memory set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1)
  select (select count(*) from u1) + (select count(*) from u2) + (select count(*) from u3)
       + (select count(*) from u4) + (select count(*) from u5) + (select count(*) from u6)
       + (select count(*) from u7) + (select count(*) from u8)
  into affected;
  return affected;
end;
$$;
