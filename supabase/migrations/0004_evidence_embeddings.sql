-- Blu V2 — RAG solo sobre evidencia aprobada (#58, ADR-0008 D-2).
-- pgvector en la misma instancia de V1: sin proveedor nuevo. Apagado por
-- configuración (BLU_RAG_ENABLED=1). Corpus: editorial aprobado, no PII.
--
-- Reglas:
--   1. Indexar solo fuentes aprobadas: la RPC vuelve a filtrar por estado
--      aprobado al buscar (si una fuente se retira, deja de recuperarse aunque
--      su vector siga ahí).
--   2. La tabla no se lee directo: solo vía match_evidence (security definer,
--      search_path fijo, límite de resultados).
--   3. Escritura solo del rol reviewer, como evidence_sources.

create extension if not exists vector;

create table evidence_embeddings (
  source_id uuid primary key references evidence_sources(id) on delete cascade,
  registry_id text not null unique check (registry_id ~ '^ev-\d{4}-\d{3}$'),
  content text not null check (char_length(content) between 1 and 4000),
  embedding vector(1536) not null,
  updated_at timestamptz not null default now()
);

create index evidence_embeddings_hnsw on evidence_embeddings using hnsw (embedding vector_cosine_ops);

alter table evidence_embeddings enable row level security;
-- Sin política de select: nadie lee la tabla directo.
create policy "reviewer_insert" on evidence_embeddings for insert to reviewer with check (true);
create policy "reviewer_update" on evidence_embeddings for update to reviewer using (true) with check (true);
create policy "no_delete" on evidence_embeddings for delete using (false);
grant insert, update on evidence_embeddings to reviewer;

create or replace function match_evidence(query_embedding vector(1536), match_threshold float, match_count integer)
returns table (registry_id text, similarity float)
language sql
stable
security definer
set search_path = public
as $$
  select e.registry_id, 1 - (e.embedding <=> query_embedding) as similarity
  from evidence_embeddings e
  join evidence_sources s on s.id = e.source_id
  where s.status = 'approved'
    and 1 - (e.embedding <=> query_embedding) >= greatest(match_threshold, 0.5)
  order by e.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 5);
$$;

revoke execute on function match_evidence(vector, float, integer) from public;
grant execute on function match_evidence(vector, float, integer) to anon, authenticated;
