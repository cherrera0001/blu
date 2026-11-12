#!/usr/bin/env node
/**
 * Asserts MASTG-oriented sobre un APK de Blu (build propio).
 * Herramientas: aapt2 (TOOL-0124), apksigner (TOOL-0123).
 *
 * Uso: node scripts/mastg-apk-assert.mjs path/to/blu.apk
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const apk = resolve(process.argv[2] ?? "");
if (!apk || !existsSync(apk)) {
  console.error("Uso: node scripts/mastg-apk-assert.mjs <archivo.apk>");
  process.exit(2);
}

function buildToolsBins(name) {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
  const out = [];
  if (home && existsSync(`${home}/build-tools`)) {
    const versions = readdirSync(`${home}/build-tools`).sort().reverse();
    for (const v of versions) out.push(`${home}/build-tools/${v}/${name}`);
  }
  out.push(name);
  return out;
}

function resolveBin(name) {
  for (const candidate of buildToolsBins(name)) {
    if (candidate !== name && !existsSync(candidate)) continue;
    try {
      execFileSync(candidate, ["--help"], { stdio: "ignore" });
      return candidate;
    } catch {
      try {
        execSync(`command -v ${name}`, { stdio: "ignore" });
        return name;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

const failures = [];
const notes = [];

const aapt2 = resolveBin("aapt2");
const apksigner = resolveBin("apksigner");

if (!aapt2) {
  failures.push("aapt2 no disponible (MASTG-TOOL-0124)");
} else {
  try {
    const badging = execFileSync(aapt2, ["dump", "badging", apk], {
      encoding: "utf8",
    });
    if (!/package: name='cl\.blu\.app'/.test(badging)) {
      failures.push("package name distinto de cl.blu.app");
    } else {
      notes.push("package cl.blu.app OK");
    }
    const versionName = badging.match(/versionName='([^']+)'/)?.[1];
    const versionCode = badging.match(/versionCode='([^']+)'/)?.[1];
    notes.push(`versionName=${versionName} versionCode=${versionCode}`);
    if (!versionName || !/^\d+\.\d+\.\d+$/.test(versionName)) {
      failures.push("versionName semver ausente");
    }
    const dangerous = [
      "android.permission.READ_CONTACTS",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.RECORD_AUDIO",
      "android.permission.CAMERA",
      "android.permission.READ_SMS",
    ];
    for (const perm of dangerous) {
      if (badging.includes(perm)) {
        failures.push(`permiso no permitido en v1: ${perm}`);
      }
    }
  } catch (error) {
    failures.push(
      `aapt2 dump badging falló: ${error instanceof Error ? error.message : error}`,
    );
  }
}

if (!apksigner) {
  failures.push("apksigner no disponible (MASTG-TOOL-0123)");
} else {
  try {
    execFileSync(apksigner, ["verify", apk], { stdio: "pipe" });
    notes.push("apksigner verify OK");
  } catch (error) {
    failures.push(
      `apksigner verify falló: ${error instanceof Error ? error.message : error}`,
    );
  }
}

const manifest = "apps/mobile/android/app/src/main/AndroidManifest.xml";
if (existsSync(manifest)) {
  const xml = readFileSync(manifest, "utf8");
  if (!/android:allowBackup="false"/.test(xml)) {
    failures.push("AndroidManifest allowBackup debe ser false");
  } else {
    notes.push("allowBackup=false OK");
  }
  if (/android:usesCleartextTraffic="true"/.test(xml)) {
    failures.push("usesCleartextTraffic=true no permitido");
  } else {
    notes.push("cleartext no forzado a true OK");
  }
} else {
  notes.push("manifest nativo no presente en workspace (OK si solo se valida badging)");
}

console.log("MASTG APK asserts — notas:");
for (const n of notes) console.log(`  - ${n}`);
if (failures.length) {
  console.error("MASTG APK asserts — fallos:");
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log("MASTG APK asserts: PASS");
