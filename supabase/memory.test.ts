// @vitest-environment node
// Verificación estática de la memoria conversacional (#43, ADR-0008 D-1).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("./migrations/0003_conversation_memory.sql", import.meta.url).pathname,
  "utf8",
);
const ddl = sql.slice(sql.search(/create\s+table\s+conversation_memory/i), sql.indexOf(");", sql.search(/create\s+table\s+conversation_memory/i)));

function head(fn: string): string {
  return sql.match(new RegExp(`function\\s+${fn}\\s*\\(\\)[\\s\\S]*?as\\s+\\$\\$`, "i"))![0];
}
function body(fn: string): string {
  return sql.match(new RegExp(`function\\s+${fn}\\s*\\(\\)[\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$`, "i"))![1];
}

describe("conversation_memory — aislamiento y minimización", () => {
  it("owner_id ligado a auth.users, RLS activa y sin DELETE desde la clienta", () => {
    expect(ddl).toMatch(/owner_id\s+uuid\s+not\s+null\s+default\s+auth\.uid\(\)\s+references\s+auth\.users\s*\(\s*id\s*\)/i);
    expect(sql).toMatch(/alter\s+table\s+conversation_memory\s+enable\s+row\s+level\s+security/i);
    expect(sql).toMatch(/create\s+policy\s+"no_delete"\s+on\s+conversation_memory\s+for\s+delete\s+using\s*\(\s*false\s*\)/i);
  });

  it("lectura solo propia; sin filtrar deleted_at (rompería el borrado lógico)", () => {
    const select = sql.match(/create\s+policy\s+"owner_select"\s+on\s+conversation_memory[\s\S]*?;/i)![0];
    expect(select).toMatch(/using\s*\(\s*owner_id\s*=\s*auth\.uid\(\)\s*\)/);
    expect(select).not.toMatch(/deleted_at/);
    expect(sql).toMatch(/grant\s+select,\s*insert,\s*update\s+on\s+conversation_memory\s+to\s+authenticated/i);
    const insert = sql.match(/create\s+policy\s+"owner_insert"\s+on\s+conversation_memory[\s\S]*?;/i)![0];
    expect(insert).toMatch(/with\s+check\s*\(\s*owner_id\s*=\s*auth\.uid\(\)/);
  });

  it("retención máxima de 30 días fijada en la base, no en la app", () => {
    expect(ddl).toMatch(/expires_at\s+timestamptz\s+not\s+null\s+default\s+\(now\(\)\s*\+\s*interval\s+'30 days'\)/i);
    expect(ddl).toMatch(/check\s*\(\s*expires_at\s*<=\s*created_at\s*\+\s*interval\s+'30 days'\s*\)/i);
  });

  it("texto acotado y roles cerrados", () => {
    expect(ddl).toMatch(/char_length\(body\)\s+between\s+1\s+and\s+2000/i);
    expect(ddl).toMatch(/role\s+in\s*\(\s*'user',\s*'assistant'\s*\)/i);
  });

  it("memory_forget es de la dueña (invoker + auth.uid())", () => {
    expect(head("memory_forget")).toMatch(/security\s+invoker/i);
    expect(body("memory_forget")).toMatch(/owner_id\s*=\s*auth\.uid\(\)/);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+memory_forget\(\)\s+to\s+authenticated/i);
  });

  it("memory_purge es administrativa y elimina lo borrado y lo caducado", () => {
    expect(head("memory_purge")).toMatch(/security\s+definer/i);
    expect(head("memory_purge")).toMatch(/set\s+search_path\s*=\s*public/i);
    expect(body("memory_purge")).toMatch(/deleted_at\s+is\s+not\s+null\s+or\s+expires_at\s*<=\s*now\(\)/i);
    expect(sql).toMatch(/revoke\s+execute\s+on\s+function\s+memory_purge\(\)\s+from\s+authenticated/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+memory_purge\(\)\s+to\s+service_role/i);
  });

  it("purga programada cada hora con pg_cron cuando existe", () => {
    expect(sql).toMatch(/cron\.schedule\('blu-memory-purge',\s*'0 \* \* \* \*',\s*'select public\.memory_purge\(\)'\)/);
  });

  it("ARCO incluye la memoria en acceso y cancelación", () => {
    expect(body("arco_access")).toMatch(/conversation_memory/);
    expect(body("arco_cancel")).toMatch(/update\s+conversation_memory\s+set\s+deleted_at/i);
  });

  it("sin bypass de service_role en políticas", () => {
    expect(sql).not.toMatch(/create\s+policy[^;]*\bto\s+service_role\b/i);
  });
});
