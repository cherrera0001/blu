import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { HABITS, MAX_SELECTED_HABITS } from "blu-core/blu";
import { STORAGE_KEY } from "./storage";
import { APP_VERSION, APP_VERSION_CODE } from "./version";

const mobileRoot = join(__dirname, "..");
const coreRoot = join(__dirname, "../../../packages/blu-core/src");

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTsFiles(full));
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

describe("MASTG/MASVS contratos — Blu móvil", () => {
  it("producto: 7 temas y tope 4 (objetivo senior)", () => {
    expect(HABITS).toHaveLength(7);
    expect(MAX_SELECTED_HABITS).toBe(4);
  });

  it("storage: una sola clave local versionada", () => {
    expect(STORAGE_KEY).toBe("blu.local.v1");
  });

  it("versión alineada (release profesional)", () => {
    const app = JSON.parse(readFileSync(join(mobileRoot, "app.json"), "utf8")) as {
      expo: {
        version: string;
        android: { allowBackup?: boolean; versionCode: number; package: string };
      };
    };
    expect(app.expo.version).toBe(APP_VERSION);
    expect(app.expo.android.versionCode).toBe(APP_VERSION_CODE);
    expect(app.expo.android.package).toBe("cl.blu.app");
    expect(app.expo.android.allowBackup).toBe(false);
  });

  it("MASVS-STORAGE/NETWORK: blu-core sin DOM ni fetch", () => {
    const files = walkTsFiles(coreRoot);
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/\bfetch\s*\(/);
      expect(src, file).not.toMatch(/\blocalStorage\b/);
      expect(src, file).not.toMatch(/\bwindow\./);
      expect(src, file).not.toMatch(/\bdocument\./);
    }
  });

  it("MASVS-CODE: apps/mobile sin secretos obvios ni http claro", () => {
    const files = walkTsFiles(join(mobileRoot, "src")).concat(
      join(mobileRoot, "App.tsx"),
    );
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/AKIA[0-9A-Z]{16}/);
      expect(src, file).not.toMatch(/BEGIN (RSA |EC )?PRIVATE KEY/);
      expect(src, file).not.toMatch(/["']http:\/\/(?!localhost)/);
    }
  });

  it("app.json endurece cleartext y backup", () => {
    const app = JSON.parse(readFileSync(join(mobileRoot, "app.json"), "utf8")) as {
      expo: { android: { allowBackup?: boolean; usesCleartextTraffic?: boolean } };
    };
    expect(app.expo.android.allowBackup).toBe(false);
    expect(app.expo.android.usesCleartextTraffic).toBe(false);
  });
});
