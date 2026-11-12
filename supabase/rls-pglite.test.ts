// @vitest-environment node
// Matriz RLS en vivo sobre Postgres real (PGlite, WASM) — corre en CI sin Docker.
// Cubre las migraciones V2 (memoria #43, RAG #58). La matriz V1 completa sigue en
// supabase/tests/rls-live-check.mjs (Docker, BLU_RLS_LIVE=1).
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { vector } from "@electric-sql/pglite/vector";
import { beforeAll, describe, expect, it } from "vitest";

const FILES = [
  "tests/bootstrap-local.sql",
  "migrations/0001_owner_only.sql",
  "migrations/0002_arco_procedures.sql",
  "migrations/0003_conversation_memory.sql",
  "migrations/0004_evidence_embeddings.sql",
];
const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const VEC = "(select array_fill(0.1::real, array[1536])::vector)";

let db: PGlite;

/** Ejecuta como un rol con (o sin) sesión; devuelve el primer valor, "ROWS n" o "ERROR: …". */
async function as(role: string, sub: string | null, sql: string): Promise<string> {
  const claims = sub ? JSON.stringify({ sub }) : "";
  try {
    await db.exec(`reset role; select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
    const r = await db.query<Record<string, unknown>>(sql);
    return r.rows[0] ? String(Object.values(r.rows[0])[0]) : `ROWS ${r.affectedRows ?? 0}`;
  } catch (e) {
    return `ERROR: ${(e as Error).message}`;
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { vector, pgcrypto } });
  for (const f of FILES) await db.exec(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"));
}, 60_000);

describe("memoria conversacional en vivo (#43, migración 0003)", () => {
  it("la dueña guarda sin enviar owner_id y la fila queda a su nombre", async () => {
    expect(await as("blu_user_b", B, "insert into conversation_memory (role, body) values ('user','hola')")).toBe("ROWS 1");
    expect(await as("postgres", null, `select count(*) from conversation_memory where owner_id='${B}'`)).toBe("1");
  });

  it("aislamiento: A no ve ni escribe a nombre de B", async () => {
    expect(await as("blu_user_a", A, "select count(*) from conversation_memory")).toBe("0");
    expect(await as("blu_user_a", A, `insert into conversation_memory (owner_id, role, body) values ('${B}','user','x')`)).toMatch(
      /row-level security/,
    );
  });

  it("retención > 30 días rechazada por la base; borrado físico bloqueado", async () => {
    expect(
      await as("blu_user_b", B, "insert into conversation_memory (role, body, expires_at) values ('user','x', now() + interval '40 days')"),
    ).toMatch(/memory_retention_max_30d/);
    expect(await as("blu_user_b", B, "delete from conversation_memory")).toMatch(/ROWS 0|permission denied/);
  });

  it("memory_forget() marca lo propio sin violar RLS y no queda nada vigente", async () => {
    expect(await as("blu_user_b", B, "select memory_forget()")).toBe("1");
    expect(await as("blu_user_b", B, "select count(*) from conversation_memory where deleted_at is null")).toBe("0");
  });

  it("ARCO incluye la memoria y arco_cancel() no falla", async () => {
    await as("blu_user_b", B, "insert into conversation_memory (role, body) values ('assistant','otra')");
    expect(await as("blu_user_b", B, "select jsonb_array_length(arco_access() -> 'conversation_memory')")).toBe("2");
    expect(await as("blu_user_b", B, "select arco_cancel()")).not.toMatch(/^ERROR/);
  });

  it("la purga es solo de service_role", async () => {
    expect(await as("blu_user_b", B, "select memory_purge()")).toMatch(/permission denied/);
    expect(await as("blu_service", null, "select memory_purge()")).toBe("2");
  });
});

describe("RAG solo sobre evidencia aprobada en vivo (#58, migración 0004)", () => {
  it("solo reviewer indexa; nadie lee la tabla directo", async () => {
    await as("blu_reviewer", null, "insert into evidence_sources (source_ref, status) values ('doi:a','approved'),('doi:p','pending')");
    expect(
      await as(
        "blu_reviewer",
        null,
        `insert into evidence_embeddings (source_id, registry_id, content, embedding)
         select id, case when status='approved' then 'ev-2099-001' else 'ev-2099-002' end, 't', ${VEC} from evidence_sources`,
      ),
    ).toBe("ROWS 2");
    expect(
      await as("blu_user_a", A, `insert into evidence_embeddings (source_id, registry_id, content, embedding) select id,'ev-2099-009','x',${VEC} from evidence_sources limit 1`),
    ).toMatch(/^ERROR/);
    expect(await as("blu_user_a", A, "select count(*) from evidence_embeddings")).toMatch(/permission denied/);
  });

  it("reviewer re-indexa (upsert) una fuente ya indexada", async () => {
    expect(
      await as(
        "blu_reviewer",
        null,
        `insert into evidence_embeddings (source_id, registry_id, content, embedding)
         select id, 'ev-2099-001', 't2', ${VEC} from evidence_sources where source_ref='doi:a'
         on conflict (source_id) do update set content = excluded.content, embedding = excluded.embedding, updated_at = now()`,
      ),
    ).toBe("ROWS 1");
  });

  it("match_evidence devuelve solo lo aprobado, con umbral y límite acotados", async () => {
    expect(await as("blu_user_a", A, `select string_agg(registry_id, ',') from match_evidence(${VEC}, 0.5, 5)`)).toBe("ev-2099-001");
    expect(await as("blu_anon", null, `select count(*) from match_evidence(${VEC}, 0.1, 50)`)).toBe("1");
  });

  it("una fuente que deja de estar aprobada deja de recuperarse", async () => {
    await as("blu_reviewer", null, "update evidence_sources set status='rejected' where source_ref='doi:a'");
    expect(await as("blu_anon", null, `select count(*) from match_evidence(${VEC}, 0.5, 5)`)).toBe("0");
  });
});
