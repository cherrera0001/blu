#!/usr/bin/env node
/**
 * Gate de auditoría (CI): falla ante vulnerabilidades high/critical, salvo
 * excepciones explícitas, justificadas y con caducidad. Una excepción vencida
 * vuelve a bloquear: obliga a revisar en vez de olvidar.
 */
import { execFileSync } from "node:child_process";

const EXCEPTIONS = [
  {
    pkg: "image-size",
    advisories: ["GHSA-5p2g-fcmc-qvqq", "GHSA-w3rx-r6r6-pgpr"],
    expires: "2027-02-15",
    reason:
      "Transitiva de metro (Expo 54), solo en build. DoS al parsear ICNS/JXL/HEIF; " +
      "metro solo procesa los PNG propios del repo. No hay 1.x corregida y la 2.x " +
      "rompe metro (exige buffer, metro pasa ruta). Revisar al subir a Expo 55.",
  },
];

const BLOCKING = new Set(["high", "critical"]);
const today = new Date().toISOString().slice(0, 10);

let raw;
try {
  raw = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 << 20 });
} catch (error) {
  raw = error.stdout; // npm audit sale con 1 cuando hay hallazgos
}
const report = JSON.parse(raw);

const advisoryId = (url) => url?.split("/").pop();
const failures = [];

for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  const direct = vuln.via.filter((v) => typeof v === "object" && BLOCKING.has(v.severity));
  for (const adv of direct) {
    const id = advisoryId(adv.url);
    const ex = EXCEPTIONS.find((e) => e.pkg === name && e.advisories.includes(id));
    if (ex && ex.expires >= today) {
      console.log(`EXCEPCIÓN ${name} ${id} (vence ${ex.expires}): ${ex.reason}`);
      continue;
    }
    failures.push(`${adv.severity.toUpperCase()} ${name} ${id}${ex ? " — excepción VENCIDA" : ""}: ${adv.title}`);
  }
}

if (failures.length) {
  console.error(`Auditoría bloqueante (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Auditoría: sin vulnerabilidades high/critical fuera de excepciones vigentes.");
