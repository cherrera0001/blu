#!/usr/bin/env node
// Verificación EN VIVO del aislamiento RLS (BLU-104) contra Postgres real.
// Ejecuta la migración 0001_owner_only.sql con el bootstrap local y recorre la
// matriz de pruebas de aislamiento de specs/009. Requiere Docker.
//
// Uso:  BLU_RLS_LIVE=1 node supabase/tests/rls-live-check.mjs
// Sin BLU_RLS_LIVE=1 el script no hace nada (así CI no requiere Docker).

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CONTAINER = "blu-rls-check";
const PORT = "55432";
const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

if (process.env.BLU_RLS_LIVE !== "1") {
  console.log("[rls-live-check] omitido (definir BLU_RLS_LIVE=1 para ejecutar; requiere Docker)");
  process.exit(0);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
}

/** Ejecuta SQL como `role`. `claims` simula el JWT de Supabase vía PGOPTIONS. */
function psql(role, sql, claims) {
  const args = ["exec", "-i"];
  if (claims) args.push("-e", `PGOPTIONS=-c request.jwt.claims={"sub":"${claims}"}`);
  args.push(CONTAINER, "psql", "-U", role, "-d", "postgres", "-v", "ON_ERROR_STOP=0", "-tA", "-c", sql);
  const run = spawnSync("docker", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();
}

try {
  try { docker(["rm", "-f", CONTAINER]); } catch { /* contenedor inexistente */ }
  docker([
    "run", "-d", "--name", CONTAINER,
    "-e", "POSTGRES_PASSWORD=blu",
    "-p", `${PORT}:5432`,
    "postgres:18-alpine",
  ]);

  let ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { docker(["exec", CONTAINER, "pg_isready", "-U", "postgres"]); ready = true; break; }
    catch { execFileSync("sleep", ["1"]); }
  }
  if (!ready) throw new Error("Postgres no quedó listo a tiempo");

  const bootstrap = readFileSync(ROOT + "tests/bootstrap-local.sql", "utf8");
  const migration1 = readFileSync(ROOT + "migrations/0001_owner_only.sql", "utf8");
  const migration2 = readFileSync(ROOT + "migrations/0002_arco_procedures.sql", "utf8");
  psql("postgres", bootstrap);
  psql("postgres", migration1);
  psql("postgres", migration2);

  // --- Escenario: la cuenta A crea su contenido --------------------------------
  psql("blu_user_a",
    `insert into profiles (owner_id, pseudonym) values ('${USER_A}', 'persona-a');
     insert into habit_plans (owner_id, habit_id, goal_version) values ('${USER_A}', 'caminar', 'v1');
     insert into check_ins (owner_id, plan_id, checked_on, result)
       select '${USER_A}', id, current_date, 'done' from habit_plans where owner_id = '${USER_A}';
     insert into reviews (owner_id, week_start, payload) values ('${USER_A}', current_date, '{}');
     insert into goal_decisions (owner_id, payload) values ('${USER_A}', '{}');
     insert into consent_records (owner_id, purpose, notice_version) values ('${USER_A}', 'sincronizacion', 'v1');`,
    USER_A);
  const ownWrite = psql("blu_user_a", "select count(*) from habit_plans;", USER_A);
  check("A escribe y lee su propio plan", ownWrite === "1", `count=${ownWrite}`);
  const checkInsA = psql("blu_user_a", "select count(*) from check_ins;", USER_A);
  check("A lee sus check-ins en cascada", checkInsA === "1", `count=${checkInsA}`);

  // --- Matriz de aislamiento (specs/009) ----------------------------------------
  const crossRead = psql("blu_user_b", "select count(*) from habit_plans;", USER_B);
  check("Lectura cruzada: B no ve el plan de A (0 filas)", crossRead === "0", `count=${crossRead}`);

  const planA = psql("postgres", "select id from habit_plans limit 1");
  const crossUpdate = psql("blu_user_b", `update habit_plans set status = 'paused' where id = '${planA}';`, USER_B);
  check("Update cruzado: B no afecta el plan de A (UPDATE 0)", crossUpdate === "UPDATE 0", crossUpdate);

  // Enumeración: B solo ve sus filas.
  psql("blu_user_b",
    `insert into habit_plans (owner_id, habit_id, goal_version) values ('${USER_B}', 'agua', 'v1');
     insert into habit_plans (owner_id, habit_id, goal_version) values ('${USER_B}', 'agua2', 'v1');`,
    USER_B);
  const enumB = psql("blu_user_b", "select count(*) from habit_plans;", USER_B);
  check("Enumeración: B solo enumera sus 2 filas", enumB === "2", `count=${enumB}`);

  const totalAsPostgres = psql("postgres", "select count(*) from habit_plans");
  check("Sanity: hay 3 planes en total (RLS oculta 1 a B)", totalAsPostgres === "3", `count=${totalAsPostgres}`);

  // no_delete: doble defensa — sin privilegio DELETE y política using(false).
  const deleteAsOwner = psql("blu_user_a", `delete from habit_plans where owner_id = '${USER_A}';`, USER_A);
  check(
    "Borrado físico bloqueado incluso para la dueña",
    /^(DELETE 0|ERROR:.*permission denied)/.test(deleteAsOwner),
    deleteAsOwner.split("\n")[0],
  );

  // Borrado lógico ARCO: sí permitido (owner_update).
  const logicalDelete = psql("blu_user_a", `update habit_plans set deleted_at = now() where owner_id = '${USER_A}';`, USER_A);
  check("Borrado lógico ARCO permitido a la dueña (UPDATE 1)", logicalDelete === "UPDATE 1", logicalDelete);

  // Insert cruzado: with check violado → error de RLS, la fila no se crea.
  const crossInsert = psql("blu_user_b",
    `insert into habit_plans (owner_id, habit_id, goal_version) values ('${USER_A}', 'robo', 'v1');`, USER_B);
  check(
    "Insert cruzado: B no puede crear plan con owner_id de A (ERROR RLS)",
    /ERROR:.*row-level security/.test(crossInsert),
    crossInsert.split("\n")[0],
  );
  const stillThree = psql("postgres", "select count(*) from habit_plans");
  check("Sanity: el intento cruzado no creó filas", stillThree === "3", `count=${stillThree}`);

  // evidence_sources: lectura autenticada, escritura solo reviewer.
  const catalogRead = psql("blu_user_b", "select count(*) from evidence_sources;", USER_B);
  check("Catálogo de evidencia: B puede leer (select autenticado)", catalogRead === "0", `count=${catalogRead}`);

  const userInsertCatalog = psql("blu_user_b",
    `insert into evidence_sources (source_ref) values ('doi:10.0000/fake');`, USER_B);
  check("Catálogo: usuaria autenticada NO escribe (ERROR)", /ERROR:/.test(userInsertCatalog), userInsertCatalog.split("\n")[0]);

  const reviewerInsert = psql("blu_reviewer",
    `insert into evidence_sources (source_ref, source_type) values ('doi:10.0000/demo', 'rct');`);
  check("Catálogo: reviewer sí escribe (INSERT 0 1)", reviewerInsert === "INSERT 0 1", reviewerInsert);

  const reviewerUpdate = psql("blu_reviewer",
    `update evidence_sources set status = 'approved' where source_ref = 'doi:10.0000/demo';`);
  check("Catálogo: reviewer sí actualiza (UPDATE 1)", reviewerUpdate === "UPDATE 1", reviewerUpdate);

  // Sin sesión (sin claims): auth.uid() es null → 0 filas visibles.
  const anonRead = psql("blu_user_b", "select count(*) from habit_plans;");
  check("Sin claims: auth.uid() null → 0 filas", anonRead === "0", `count=${anonRead}`);

  // --- Procedimientos ARCO (C5, migración 0002) ---------------------------------
  const accessA = psql("blu_user_a", "select jsonb_array_length(arco_access() -> 'habit_plans');", USER_A);
  check("ARCO acceso: A solo ve sus propios planes en el JSON", accessA === "1", `count=${accessA}`);

  const accessB = psql("blu_user_b", "select jsonb_array_length(arco_access() -> 'habit_plans');", USER_B);
  check("ARCO acceso: B solo ve sus 2 planes (nunca los de A)", accessB === "2", `count=${accessB}`);

  const cancelA = psql("blu_user_a", "select arco_cancel();", USER_A);
  check("ARCO cancelación: marca deleted_at en las 5 filas restantes de A", cancelA === "5", cancelA.split("\n")[0]);
  const stillReadable = psql("blu_user_a", "select count(*) from habit_plans where deleted_at is not null;", USER_A);
  check("Borrado lógico verificable: A ve su fila marcada", stillReadable === "1", `count=${stillReadable}`);

  const objection = psql("blu_user_a", "select arco_objection('mejora', '2.0.0') is not null;", USER_A);
  check("ARCO oposición: registra retiro de propósito", objection === "t", objection);

  const purgeAsUser = psql("blu_user_a", "select arco_purge(30);", USER_A);
  check("Purge revocada para autenticadas (permission denied)", /ERROR:.*permission denied/.test(purgeAsUser), purgeAsUser.split("\n")[0]);

  // Fila vieja eliminada por purga; la cancelación reciente de A NO se toca.
  psql("postgres",
    `insert into habit_plans (owner_id, habit_id, goal_version, deleted_at)
     values ('${USER_A}', 'viejo', 'v1', now() - interval '40 days');`);
  const purgeService = psql("blu_service", "select arco_purge(30);");
  check("Purge con service_role elimina solo lo antiguo (1 fila)", purgeService.startsWith("1"), purgeService.split("\n")[0]);
  const recentKept = psql("postgres",
    "select count(*) from habit_plans where owner_id = '11111111-1111-1111-1111-111111111111' and deleted_at is not null;");
  check("Cancelación reciente de A sobrevive a la purga", recentKept === "1", `count=${recentKept}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n[rls-live-check] ${results.length - failed.length}/${results.length} casos en verde`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} finally {
  try { docker(["rm", "-f", CONTAINER]); } catch { /* ya estaba limpio */ }
}
