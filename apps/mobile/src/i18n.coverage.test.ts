import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hasEntry, LOCALES, type Locale } from "blu-core/i18n";
import { REMINDER_BODY } from "blu-core/reminder";
import { describeReplySource } from "./chat/source";
import { OPERATIVE_NOTICE } from "./content/notice";
import { WHY_DISCLAIMER } from "./content/why";
import { makeT } from "./i18n-core";

const mobileRoot = join(__dirname, "..");
const TARGETS = LOCALES.filter((l): l is Exclude<Locale, "es"> => l !== "es");

function sourceFiles(): string[] {
  const out: string[] = [join(mobileRoot, "App.tsx")];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(path);
    }
  })(join(mobileRoot, "src"));
  return out;
}

const unquote = (raw: string) => JSON.parse(`"${raw}"`) as string;
const STR = String.raw`"((?:[^"\\]|\\.)*)"`;

/**
 * Claves visibles: literales pasados a t(), etiquetas de opciones, mensajes que
 * la pantalla traduce al mostrar y constantes de aviso. Castellano = clave.
 */
function visibleKeys(): string[] {
  const keys = new Set<string>([
    OPERATIVE_NOTICE,
    WHY_DISCLAIMER,
    REMINDER_BODY,
    describeReplySource("remote")!,
    describeReplySource("local-rules")!,
  ]);
  const patterns = [
    new RegExp(String.raw`\bt\(\s*${STR}`, "g"),
    new RegExp(String.raw`label: ${STR}`, "g"),
    new RegExp(String.raw`setMessage\(${STR}`, "g"),
    new RegExp(String.raw`message: ${STR}`, "g"),
    new RegExp(String.raw`error:\s*${STR}`, "g"),
    new RegExp(String.raw`error\.message\s*:\s*${STR}`, "g"),
    new RegExp(String.raw`(?:CHAT_PRIVACY_NOTICE|GREETING) =\s*${STR}`, "g"),
  ];
  for (const file of sourceFiles()) {
    const text = readFileSync(file, "utf8");
    for (const re of patterns) for (const m of text.matchAll(re)) keys.add(unquote(m[1]));
  }
  return [...keys].filter((k) => /[a-záéíóúñ]/i.test(k));
}

describe("i18n móvil (BLU-1504, #126)", () => {
  it("encuentra las claves de la app (el extractor no quedó vacío)", () => {
    const keys = visibleKeys();
    expect(keys.length).toBeGreaterThan(100);
    expect(keys).toContain("Hoy");
    expect(keys).toContain("Elige al menos un tema para continuar.");
    expect(keys).toContain("No se pudieron leer los datos guardados en este dispositivo.");
  });

  it("toda clave visible tiene traducción en en-US, pt-BR, pt-PT y zh-CN", () => {
    const missing = visibleKeys().flatMap((k) =>
      TARGETS.filter((l) => !hasEntry(l, k)).map((l) => `${l}: ${k}`),
    );
    expect(missing).toEqual([]);
  });

  it("las traducciones conservan las variables {nombre}", () => {
    const broken: string[] = [];
    for (const key of visibleKeys()) {
      const vars = [...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      if (!vars.length) continue;
      for (const l of TARGETS) {
        const out = makeT(l)(key);
        const got = [...out.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        if (got.join() !== vars.join()) broken.push(`${l}: ${key}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("el aviso de privacidad no se suaviza al traducir (servidor + no se guarda)", () => {
    const en = makeT("en-US");
    expect(en(OPERATIVE_NOTICE)).toMatch(/only on this phone/i);
    expect(en(OPERATIVE_NOTICE)).toMatch(/Blu server/i);
    expect(en(OPERATIVE_NOTICE)).toMatch(/not stored|not saved/i);
    expect(en(OPERATIVE_NOTICE)).toMatch(/not a medical service/i);
  });
});
