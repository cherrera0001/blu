#!/usr/bin/env node
// Indexación RAG (#58, ADR-0008 D-2): registro local → evidence_embeddings.
//
// Solo indexa fuentes con cita publicable (aprobada + revisión nominada; la
// misma regla que buildCorpus/citationFor, verificada por src/lib/rag/indexer.test.ts)
// Y que en la base también estén aprobadas (evidence_sources.status, mismo
// source_ref). Corre con la sesión de una cuenta reviewer, nunca con service_role.
//
// Por defecto es simulación: muestra el plan. Con --apply escribe.
//
//   SUPABASE_URL=… SUPABASE_ANON_KEY=… BLU_REVIEWER_JWT=… \
//   BLU_EMBED_BASE_URL=… BLU_EMBED_API_KEY=… BLU_EMBED_MODEL=… \
//   node scripts/rag-index.mjs [--apply]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const EMBEDDING_DIMENSIONS = 1536;

/** Misma regla que citationFor(): aprobada, con fecha y revisor nominado. */
export function isCitable(source) {
  return source.status === "aprobada" && Boolean(source.reviewedAt) && Boolean(source.reviewer);
}

/** Mismo texto que buildCorpus() indexa. */
export function indexText(source) {
  return [source.claim, source.outcomes, source.population].join(". ").slice(0, 4000);
}

/**
 * Plan de indexación: cruza el registro local con el catálogo de la base.
 * Una fuente se indexa solo si es citable aquí Y está aprobada allá.
 */
export function planIndex(sources, catalog) {
  const approvedByRef = new Map(catalog.filter((c) => c.status === "approved").map((c) => [c.source_ref, c.id]));
  const index = [];
  const skipped = [];
  for (const s of sources) {
    if (!isCitable(s)) {
      skipped.push({ id: s.id, reason: "no_citable" });
      continue;
    }
    const sourceId = approvedByRef.get(s.referenceValue);
    if (!sourceId) {
      skipped.push({ id: s.id, reason: "no_aprobada_en_base" });
      continue;
    }
    index.push({ source_id: sourceId, registry_id: s.id, content: indexText(s) });
  }
  return { index, skipped };
}

function env(name) {
  const v = (process.env[name] ?? "").trim();
  if (!v) throw new Error(`Falta ${name}`);
  return v;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const anon = env("SUPABASE_ANON_KEY");
  const jwt = env("BLU_REVIEWER_JWT");
  const headers = { apikey: anon, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" };

  const registryPath = fileURLToPath(new URL("../src/data/evidence/sources.json", import.meta.url));
  const { sources } = JSON.parse(readFileSync(registryPath, "utf8"));

  const res = await fetch(`${url}/rest/v1/evidence_sources?select=id,source_ref,status`, { headers });
  if (!res.ok) throw new Error(`No se pudo leer evidence_sources (${res.status})`);
  const { index, skipped } = planIndex(sources, await res.json());

  console.log(`[rag-index] ${index.length} para indexar, ${skipped.length} omitidas`);
  for (const s of skipped) console.log(`  omitida ${s.id}: ${s.reason}`);
  if (!apply) {
    for (const r of index) console.log(`  indexaría ${r.registry_id}`);
    console.log("[rag-index] simulación: agrega --apply para escribir");
    return;
  }

  const embedBase = env("BLU_EMBED_BASE_URL").replace(/\/+$/, "");
  for (const row of index) {
    const e = await fetch(`${embedBase}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("BLU_EMBED_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: env("BLU_EMBED_MODEL"), input: row.content, dimensions: EMBEDDING_DIMENSIONS }),
    });
    if (!e.ok) throw new Error(`Embedding falló para ${row.registry_id} (${e.status})`);
    const embedding = (await e.json()).data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding inválido para ${row.registry_id}`);
    }
    const up = await fetch(`${url}/rest/v1/evidence_embeddings?on_conflict=source_id`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ ...row, embedding: `[${embedding.join(",")}]`, updated_at: new Date().toISOString() }),
    });
    if (!up.ok) throw new Error(`Upsert falló para ${row.registry_id} (${up.status})`);
    console.log(`  indexada ${row.registry_id}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(`[rag-index] ${err.message}`);
    process.exitCode = 1;
  });
}
