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

function toWindowsPath(p) {
  try {
    return execFileSync("wslpath", ["-w", p], { encoding: "utf8" }).trim();
  } catch {
    return p;
  }
}

function buildToolsBins(name) {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
  const out = [];
  if (home && existsSync(`${home}/build-tools`)) {
    const versions = readdirSync(`${home}/build-tools`).sort().reverse();
    for (const v of versions) {
      const base = `${home}/build-tools/${v}/${name}`;
      // WSL suele ver el SDK de Windows: preferir .exe / .bat si existen.
      out.push(`${base}.exe`, `${base}.bat`, base);
    }
  }
  out.push(`${name}.exe`, `${name}.bat`, name);
  return out;
}

function resolveBin(name) {
  for (const candidate of buildToolsBins(name)) {
    if (!existsSync(candidate) && candidate !== name) continue;
    if (existsSync(candidate) && (candidate.endsWith(".exe") || candidate.endsWith(".bat"))) {
      return candidate;
    }
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

function runBin(bin, args) {
  if (bin.endsWith(".bat")) {
    const winBin = toWindowsPath(bin);
    const winArgs = args.map((a) =>
      typeof a === "string" && a.startsWith("/") ? toWindowsPath(a) : a,
    );
    return execFileSync("cmd.exe", ["/c", winBin, ...winArgs], {
      encoding: "utf8",
      stdio: "pipe",
      cwd: "/mnt/c/Windows/System32",
    });
  }
  return execFileSync(bin, args, { encoding: "utf8", stdio: "pipe" });
}

const failures = [];
const notes = [];

const aapt2 = resolveBin("aapt2");
const apksigner = resolveBin("apksigner");

if (!aapt2) {
  failures.push("aapt2 no disponible (MASTG-TOOL-0124)");
} else {
  try {
    const badging = runBin(aapt2, ["dump", "badging", apk]);
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
    runBin(apksigner, ["verify", "--print-certs", apk]);
    notes.push("apksigner verify OK");
  } catch (error) {
    failures.push(
      `apksigner verify falló: ${error instanceof Error ? error.message : error}`,
    );
  }
}

// Sideload sin Metro: el APK DEBE embeber el bundle JS/Hermes.
try {
  const listing = execFileSync("unzip", ["-Z1", apk], { encoding: "utf8" });
  const hasJsBundle =
    /(^|\/)index\.android\.bundle$|(^|\/)index\.android\.bundle\.hbc$|(^|\/).+\.hbc$/m.test(
      listing,
    ) || /assets\/index\.android\.bundle/m.test(listing);
  if (!hasJsBundle) {
    failures.push(
      "APK sin bundle JS embebido (assets/index.android.bundle) — no es instalable offline",
    );
  } else {
    notes.push("bundle JS embebido OK");
  }
} catch (error) {
  failures.push(
    `no se pudo listar APK: ${error instanceof Error ? error.message : error}`,
  );
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
