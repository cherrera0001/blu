#!/usr/bin/env node
/**
 * Copia JSON canónicos de packages/blu-core → src/data (web).
 * Evita symlinks de git (rotos en WSL/Windows con core.symlinks=false).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pairs = [
  ["packages/blu-core/data/habits/catalog.json", "src/data/habits/catalog.json"],
  ["packages/blu-core/data/habits/education.json", "src/data/habits/education.json"],
  ["packages/blu-core/data/onboarding/bank.json", "src/data/onboarding/bank.json"],
];

for (const [from, to] of pairs) {
  const dest = join(root, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(root, from), dest);
  console.log(`synced ${to}`);
}
