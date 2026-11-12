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

  it("MASVS-NETWORK (specs/025-026): red solo vía httpJson al BFF https, nunca fetch directo", () => {
    const files = walkTsFiles(join(mobileRoot, "src")).concat(
      join(mobileRoot, "App.tsx"),
    );
    const callers: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!file.endsWith("polyfill.ts")) {
        expect(src, file).not.toMatch(/\bfetch\s*\(/);
      }
      if (/\bhttpJson\s*[<(]/.test(src) && !file.endsWith(join("net", "http.ts"))) {
        callers.push(file);
        // Toda llamada apunta a la base configurada del BFF, nunca a un host literal.
        for (const m of src.matchAll(/httpJson(?:<[^>]*>)?\(\s*([^,]+),/g)) {
          expect(m[1].trim(), file).toMatch(/^`\$\{BLU_API_BASE\}\/api\/(assistant|voice)`$/);
        }
      }
    }
    expect(callers.map((f) => f.split(/[\\/]/).pop()).sort()).toEqual([
      "ChatScreen.tsx",
      "speak.ts",
    ]);
    const config = readFileSync(join(mobileRoot, "src/config.ts"), "utf8");
    expect(config).toMatch(/"https:\/\/[^"]+"/);
  });

  it("transparencia (specs/025-026): chat y voz natural avisan que el texto va al servidor", () => {
    const chat = readFileSync(join(mobileRoot, "src/screens/ChatScreen.tsx"), "utf8");
    expect(chat).toContain('testID="chat-privacy-notice"');
    expect(chat).toMatch(/servidor de Blu[^"]*no se guardan/);
    expect(chat).toContain("{t(CHAT_PRIVACY_NOTICE)}");
    const speak = readFileSync(join(mobileRoot, "src/components/SpeakButton.tsx"), "utf8");
    expect(speak).toMatch(/envía este texto al servidor de Blu; no se guarda/);
  });

  it("specs/026 FR-005: «solo voz del teléfono» corta la llamada a /api/voice", () => {
    const app = readFileSync(join(mobileRoot, "App.tsx"), "utf8");
    expect(app).toMatch(/naturalAvailable = state\.voicePreference !== "device"/);
    const button = readFileSync(join(mobileRoot, "src/components/SpeakButton.tsx"), "utf8");
    expect(button).toMatch(/preferNatural: preferNatural && naturalAvailable/);
    const speak = readFileSync(join(mobileRoot, "src/voice/speak.ts"), "utf8");
    // La única llamada de red está dentro del bloque if (preferNatural).
    const gate = speak.indexOf("if (preferNatural) {");
    expect(gate).toBeGreaterThan(-1);
    expect(speak.indexOf("httpJson(")).toBeGreaterThan(gate);
  });

  it("consentimiento 2.2.0 (H5, BLU-1504): el aviso inicial declara qué pasa por el servidor y se renueva sin bloquear", async () => {
    const { CONSENT_VERSION } = await import("blu-core/consent");
    const { OPERATIVE_NOTICE } = await import("./content/notice");
    expect(CONSENT_VERSION).toBe("2.2.0");
    expect(OPERATIVE_NOTICE).toMatch(/chat también envía tu idioma y qué temas elegiste/);
    expect(OPERATIVE_NOTICE).toMatch(/solo en este teléfono/);
    expect(OPERATIVE_NOTICE).toMatch(/chat o la voz natural.*servidor de Blu y no se guarda/);
    expect(OPERATIVE_NOTICE).toMatch(/no es un servicio médico/);
    const onboarding = readFileSync(join(mobileRoot, "src/screens/OnboardingScreen.tsx"), "utf8");
    expect(onboarding).toContain("{t(OPERATIVE_NOTICE)}");
    expect(onboarding).toMatch(/!needsReconsent\(state\.consent\)/);
    const today = readFileSync(join(mobileRoot, "src/screens/TodayScreen.tsx"), "utf8");
    expect(today).toContain('testID="consent-renew"');
  });

  it("MASVS-PLATFORM: solo POST_NOTIFICATIONS (ADR-0010) y sin micrófono", () => {
    const app = JSON.parse(readFileSync(join(mobileRoot, "app.json"), "utf8")) as {
      expo: { android: { permissions?: string[] }; plugins?: unknown[] };
    };
    // ADR-0010 regla 6: el único permiso declarado es el del recordatorio local.
    // expo-notifications suma RECEIVE_BOOT_COMPLETED (permiso normal) para
    // conservar el aviso tras reiniciar; no es peligroso ni da acceso a datos.
    expect(app.expo.android.permissions).toEqual(["android.permission.POST_NOTIFICATIONS"]);
    const av = app.expo.plugins?.find(
      (p): p is [string, { microphonePermission?: unknown }] =>
        Array.isArray(p) && p[0] === "expo-av",
    );
    expect(av?.[1].microphonePermission).toBe(false);
  });

  it("ADR-0010: recordatorio solo local — sin push remoto, sin red, borrado lo cancela", () => {
    const files = sourceFilesForReminder();
    for (const [file, text] of files) {
      expect(text, file).not.toMatch(/getExpoPushTokenAsync|getDevicePushTokenAsync|addPushTokenListener/);
    }
    const notify = readFileSync(join(mobileRoot, "src/reminder/notify.ts"), "utf8");
    expect(notify).not.toMatch(/httpJson|fetch\(|XMLHttpRequest/);
    expect(notify).toMatch(/SchedulableTriggerInputTypes\.DATE/);
    const app = readFileSync(join(mobileRoot, "App.tsx"), "utf8");
    // Permiso pedido solo al activar, y «Borrar mis datos» cancela lo programado.
    expect(app.indexOf("requestReminderPermission()")).toBeGreaterThan(app.indexOf("onReminderChange="));
    expect(app.indexOf("await cancelReminders();")).toBeLessThan(app.indexOf("await clearBluState();"));
  });

  it("app.json endurece cleartext y backup", () => {
    const app = JSON.parse(readFileSync(join(mobileRoot, "app.json"), "utf8")) as {
      expo: { android: { allowBackup?: boolean; usesCleartextTraffic?: boolean } };
    };
    expect(app.expo.android.allowBackup).toBe(false);
    expect(app.expo.android.usesCleartextTraffic).toBe(false);
  });
});

function sourceFilesForReminder(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        out.push([path, readFileSync(path, "utf8")]);
      }
    }
  };
  walk(join(mobileRoot, "src"));
  out.push([join(mobileRoot, "App.tsx"), readFileSync(join(mobileRoot, "App.tsx"), "utf8")]);
  return out;
}
