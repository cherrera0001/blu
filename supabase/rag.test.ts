// @vitest-environment node
// Verificación estática del RAG sobre evidencia aprobada (#58, ADR-0008 D-2).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("./migrations/0004_evidence_embeddings.sql", import.meta.url).pathname, "utf8");
const fn = sql.match(/function\s+match_evidence[\s\S]*?as\s+\$\$([\s\S]*?)\$\$/i)!;

describe("evidence_embeddings — RAG solo aprobado", () => {
  it("pgvector en la misma instancia y RLS activa", () => {
    expect(sql).toMatch(/create\s+extension\s+if\s+not\s+exists\s+vector/i);
    expect(sql).toMatch(/alter\s+table\s+evidence_embeddings\s+enable\s+row\s+level\s+security/i);
  });

  it("nadie lee la tabla directo: sin política de select", () => {
    expect(sql).not.toMatch(/create\s+policy[^;]*on\s+evidence_embeddings\s+for\s+select/i);
    expect(sql).toMatch(/create\s+policy\s+"no_delete"\s+on\s+evidence_embeddings\s+for\s+delete\s+using\s*\(\s*false\s*\)/i);
  });

  it("escritura solo del rol reviewer", () => {
    expect(sql).toMatch(/"reviewer_insert"\s+on\s+evidence_embeddings\s+for\s+insert\s+to\s+reviewer/i);
    expect(sql).toMatch(/"reviewer_update"\s+on\s+evidence_embeddings\s+for\s+update\s+to\s+reviewer/i);
    expect(sql).not.toMatch(/grant\s+insert[^;]*evidence_embeddings[^;]*to\s+(anon|authenticated)/i);
  });

  it("match_evidence re-filtra por estado aprobado, con umbral mínimo y límite", () => {
    const head = fn[0];
    const body = fn[1];
    expect(head).toMatch(/security\s+definer/i);
    expect(head).toMatch(/set\s+search_path\s*=\s*public/i);
    expect(body).toMatch(/join\s+evidence_sources\s+s\s+on\s+s\.id\s*=\s*e\.source_id/i);
    expect(body).toMatch(/s\.status\s*=\s*'approved'/i);
    expect(body).toMatch(/greatest\(match_threshold,\s*0\.5\)/i);
    expect(body).toMatch(/limit\s+least\(greatest\(match_count,\s*1\),\s*5\)/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+match_evidence[^;]*from\s+public/i);
  });

  it("solo devuelve id de registro y similitud (sin contenido ni vectores)", () => {
    expect(sql).toMatch(/returns\s+table\s*\(\s*registry_id\s+text,\s*similarity\s+float\s*\)/i);
  });
});
