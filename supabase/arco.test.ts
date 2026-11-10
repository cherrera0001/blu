// @vitest-environment node
// Verificación estática de los procedimientos ARCO (C5 de ADR-0006, BLU-1203/1601).
// La comprobación en vivo vive en supabase/tests/rls-live-check.mjs (BLU_RLS_LIVE=1).
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

function migrationSql(): string {
  const files = readdirSync(new URL("./migrations/", import.meta.url).pathname)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files
    .map((f) => readFileSync(new URL(`./migrations/${f}`, import.meta.url).pathname, "utf8"))
    .join("\n");
}

const sql = migrationSql();

function bodyOf(fn: string): string {
  const m = sql.match(new RegExp(`function\\s+${fn}[\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$`, "i"));
  expect(m, `cuerpo de ${fn}`).toBeTruthy();
  return m![1];
}

describe("procedimientos ARCO — migración V1", () => {
  it("existe migración 0002 con funciones ARCO", () => {
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+arco_access\s*\(/i);
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+arco_cancel\s*\(/i);
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+arco_purge\s*\(/i);
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+arco_objection\s*\(/i);
  });

  it("arco_access y arco_cancel son owner-scoped (auth.uid())", () => {
    expect(bodyOf("arco_access")).toMatch(/auth\.uid\(\)/);
    expect(bodyOf("arco_cancel")).toMatch(/auth\.uid\(\)/);
  });

  it("arco_purge solo toca filas ya marcadas deleted_at y fija search_path", () => {
    expect(bodyOf("arco_purge")).toMatch(/deleted_at\s+is\s+not\s+null/i);
    const head = sql.match(/function\s+arco_purge[\s\S]*?as\s+\$\$/i)![0];
    expect(head).toMatch(/security\s+definer/i);
    expect(head).toMatch(/set\s+search_path\s*=\s*public/i);
  });

  it("purga administrativa: revocado a autenticadas, concedido solo a service_role", () => {
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+arco_purge[^;]*from\s+authenticated/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+arco_purge[^;]*to\s+service_role/i);
  });

  it("arco_objection registra retiro en consent_records ligado a la dueña", () => {
    const body = bodyOf("arco_objection");
    expect(body).toMatch(/consent_records/i);
    expect(body).toMatch(/auth\.uid\(\)/);
    expect(body).toMatch(/withdrawn/i);
  });

  it("las funciones personales son ejecutables por el rol autenticado", () => {
    for (const fn of ["arco_access", "arco_cancel", "arco_objection"]) {
      expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${fn}[^;]*to\\s+authenticated`, "i"));
    }
  });
});
