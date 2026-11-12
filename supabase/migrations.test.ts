// @vitest-environment node
// Verificación estática de las migraciones V1 (BLU-104, specs/009).
// La comprobación en vivo contra Postgres real vive en supabase/tests/rls-live-check.mjs
// (requiere Docker; se ejecuta manualmente con BLU_RLS_LIVE=1).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const specText = readFileSync(
  fileURLToPath(new URL("./009-v1-isolation-rls/spec.md", new URL("../specs/", import.meta.url))),
  "utf8",
);
const migrationsDir = fileURLToPath(new URL("./migrations/", import.meta.url));

/** Catálogo canónico de tablas: el que declara specs/009 (párrafo "Tablas V1:"). */
function specTables(): { personal: string[]; catalog: string[] } {
  const lines = specText.split("\n");
  const start = lines.findIndex((l) => l.startsWith("Tablas V1:"));
  expect(start, "specs/009 debe listar las tablas V1").toBeGreaterThanOrEqual(0);
  let paragraph = "";
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i];
    if (i > start && line.trim() === "") break;
    paragraph += `${line} `;
    if (line.trimEnd().endsWith(").")) break;
  }
  const names = [...paragraph.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]);
  expect(names.length).toBeGreaterThanOrEqual(7);
  return {
    personal: names.filter((n) => n !== "evidence_sources"),
    catalog: names.filter((n) => n === "evidence_sources"),
  };
}

function migrationSql(): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  expect(files.length, "debe existir al menos una migración").toBeGreaterThan(0);
  return files.map((f) => readFileSync(migrationsDir + f, "utf8")).join("\n");
}

/** Tablas V2 (ADR-0008): párrafo "Tablas V2:" de specs/009; tienen su propio test. */
function specV2Tables(): string[] {
  const line = specText.split("\n").find((l) => l.startsWith("Tablas V2:")) ?? "";
  return [...line.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).filter((n) => !n.includes("memory_forget"));
}

/** DDL completo de una tabla (desde `create table` hasta el `;` que cierra). */
function tableDdl(sql: string, table: string): string {
  const start = sql.search(new RegExp(`create\\s+table\\s+${table}\\s*\\(`, "i"));
  expect(start, `create table ${table}`).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf(";", start);
  return sql.slice(start, end);
}

describe("migraciones V1 — catálogo de tablas (specs/009)", () => {
  const sql = migrationSql();
  const { personal, catalog } = specTables();

  it("crea exactamente las tablas del catálogo canónico, sin extras", () => {
    const created = [...sql.matchAll(/create\s+table\s+([a-z_]+)\s*\(/gi)].map((m) => m[1]);
    expect(created.sort()).toEqual([...personal, ...catalog, ...specV2Tables()].sort());
  });

  it("los archivos siguen la convención de nombre numerado", () => {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    for (const f of files) expect(f).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
  });
});

describe("migraciones V1 — políticas owner-only por tabla personal", () => {
  const sql = migrationSql();
  const { personal } = specTables();

  for (const table of personal) {
    describe(`tabla ${table}`, () => {
      it("lleva owner_id referenciando auth.users", () => {
        const ddl = tableDdl(sql, table);
        expect(ddl).toMatch(/owner_id\s+uuid\s+not\s+null/i);
        expect(ddl).toMatch(/references\s+auth\.users\s*\(\s*id\s*\)/i);
      });

      it("habilita RLS", () => {
        expect(sql).toMatch(new RegExp(`alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`, "i"));
      });

      it("política owner_select con auth.uid()", () => {
        expect(sql).toMatch(
          new RegExp(
            `create\\s+policy\\s+"owner_select"\\s+on\\s+${table}\\s+for\\s+select\\s+using\\s*\\(\\s*owner_id\\s*=\\s*auth\\.uid\\(\\)\\s*\\)`,
            "i",
          ),
        );
      });

      it("política owner_insert con auth.uid() en with check", () => {
        expect(sql).toMatch(
          new RegExp(
            `create\\s+policy\\s+"owner_insert"\\s+on\\s+${table}\\s+for\\s+insert\\s+with\\s+check\\s*\\(\\s*owner_id\\s*=\\s*auth\\.uid\\(\\)\\s*\\)`,
            "i",
          ),
        );
      });

      it("política owner_update con auth.uid() en using y with check", () => {
        expect(sql).toMatch(
          new RegExp(
            `create\\s+policy\\s+"owner_update"\\s+on\\s+${table}\\s+for\\s+update\\s+using\\s*\\(\\s*owner_id\\s*=\\s*auth\\.uid\\(\\)\\s*\\)\\s+with\\s+check\\s*\\(\\s*owner_id\\s*=\\s*auth\\.uid\\(\\)\\s*\\)`,
            "i",
          ),
        );
      });

      it("política no_delete (borrado lógico con deleted_at)", () => {
        expect(sql).toMatch(
          new RegExp(`create\\s+policy\\s+"no_delete"\\s+on\\s+${table}\\s+for\\s+delete\\s+using\\s*\\(\\s*false\\s*\\)`, "i"),
        );
        expect(tableDdl(sql, table)).toMatch(/deleted_at\s+timestamptz/i);
      });

      it("tiene índice por owner (consultas aisladas)", () => {
        expect(sql).toMatch(new RegExp(`create\\s+index\\s+\\w*${table}\\w*owner\\w*\\s+on\\s+${table}\\s*\\(\\s*owner_id\\s*\\)`, "i"));
      });
    });
  }
});

describe("migraciones V1 — evidence_sources (catálogo de solo lectura)", () => {
  const sql = migrationSql();
  const table = "evidence_sources";

  it("habilita RLS", () => {
    expect(sql).toMatch(new RegExp(`alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`, "i"));
  });

  it("select abierto a rol authenticated", () => {
    expect(sql).toMatch(
      new RegExp(`create\\s+policy\\s+"catalog_select"\\s+on\\s+${table}\\s+for\\s+select\\s+to\\s+authenticated`, "i"),
    );
  });

  it("insert/update solo para rol reviewer", () => {
    expect(sql).toMatch(
      new RegExp(`create\\s+policy\\s+"reviewer_insert"\\s+on\\s+${table}\\s+for\\s+insert\\s+to\\s+reviewer`, "i"),
    );
    expect(sql).toMatch(
      new RegExp(`create\\s+policy\\s+"reviewer_update"\\s+on\\s+${table}\\s+for\\s+update\\s+to\\s+reviewer`, "i"),
    );
  });

  it("sin políticas owner (no es tabla personal)", () => {
    expect(sql).not.toMatch(new RegExp(`create\\s+policy\\s+"owner_\\w+"\\s+on\\s+${table}`, "i"));
  });
});

describe("migraciones V1 — reglas transversales (specs/009)", () => {
  const sql = migrationSql();

  it("sin política de bypass para service_role", () => {
    expect(sql).not.toMatch(/create\s+policy[^;]*\bto\s+service_role\b/i);
  });

  it("auth.uid() se usa como origen de identidad (sin comparar con columnas de texto)", () => {
    expect(sql).toMatch(/auth\.uid\(\)/);
  });
});
