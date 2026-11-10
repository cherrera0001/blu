-- Blu V1 — Procedimientos ARCO operativos (C5 de ADR-0006).
-- Acceso/portabilidad, rectificación, cancelación (borrado lógico) y oposición
-- (retiro por propósito) ejecutables por la persona autenticada, owner-scoped.
-- La purga física es administrativa (service_role) y solo toca filas ya
-- marcadas con deleted_at: la persona nunca dispara borrado físico.

-- ---------------------------------------------------------------------------
-- Acceso / portabilidad: JSON con todo lo de la persona titular (solo suyo por RLS).
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
    'goal_decisions', coalesce((select jsonb_agg(g) from goal_decisions g where g.owner_id = auth.uid()), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelación (borrado lógico ARCO): marca deleted_at en toda fila de la dueña.
-- El borrado físico lo ejecuta arco_purge con retención diferida.
-- ---------------------------------------------------------------------------
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
       u7 as (update goal_decisions set deleted_at = now() where owner_id = auth.uid() and deleted_at is null returning 1)
  select (select count(*) from u1) + (select count(*) from u2) + (select count(*) from u3)
       + (select count(*) from u4) + (select count(*) from u5) + (select count(*) from u6)
       + (select count(*) from u7)
  into affected;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- Oposición: retiro de un propósito registrado en la tabla de auditoría.
-- (El efecto operativo del retiro lo aplica la lógica de la app con este registro.)
-- ---------------------------------------------------------------------------
create or replace function arco_objection(purpose text, notice_version text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  if purpose is null or purpose !~ '^[a-z_]{3,40}$' then
    raise exception 'propósito inválido';
  end if;
  insert into consent_records (owner_id, purpose, notice_version, status, withdrawn_at)
  values (auth.uid(), purpose, coalesce(notice_version, ''), 'withdrawn', now())
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Purga física (administrativa): elimina filas marcadas deleted_at hace más de
-- retention_days. security definer, pero acotada por condición explícita;
-- revocada para el rol autenticado y concedida solo a service_role.
-- ---------------------------------------------------------------------------
create or replace function arco_purge(retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz;
  affected integer;
begin
  if retention_days is null or retention_days < 1 then
    raise exception 'retention_days debe ser >= 1';
  end if;
  cutoff := now() - make_interval(days => retention_days);
  with d1 as (delete from check_ins where deleted_at is not null and deleted_at < cutoff returning 1),
       d2 as (delete from adaptation_events where deleted_at is not null and deleted_at < cutoff returning 1),
       d3 as (delete from reviews where deleted_at is not null and deleted_at < cutoff returning 1),
       d4 as (delete from goal_decisions where deleted_at is not null and deleted_at < cutoff returning 1),
       d5 as (delete from habit_plans where deleted_at is not null and deleted_at < cutoff returning 1),
       d6 as (delete from consent_records where deleted_at is not null and deleted_at < cutoff returning 1),
       d7 as (delete from profiles where deleted_at is not null and deleted_at < cutoff returning 1)
  select (select count(*) from d1) + (select count(*) from d2) + (select count(*) from d3)
       + (select count(*) from d4) + (select count(*) from d5) + (select count(*) from d6)
       + (select count(*) from d7)
  into affected;
  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privilegios: funciones personales para autenticadas; purga solo para service_role.
-- ---------------------------------------------------------------------------
grant execute on function arco_access() to authenticated;
grant execute on function arco_cancel() to authenticated;
grant execute on function arco_objection(text, text) to authenticated;
revoke execute on function arco_purge(integer) from public;
revoke execute on function arco_purge(integer) from authenticated;
grant execute on function arco_purge(integer) to service_role;
