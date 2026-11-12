import { describe, expect, it } from "vitest";
import { createInitialState, decodeState, HABITS } from "./blu";
import { COMPANION_LINES } from "./companion";
import { loadCatalog } from "./habit-catalog";
import { loadEducation } from "./habit-education";
import { hasEntry, LOCALES, pickLocale, translate, translateWith, type Locale } from "./i18n";

const TARGETS = LOCALES.filter((l): l is Exclude<Locale, "es"> => l !== "es");

/** Todo texto de contenido que la app o la web muestran desde el core. */
function coreContent(): string[] {
  const out = new Set<string>();
  for (const h of HABITS) {
    out.add(h.title);
    out.add(h.description);
    out.add(h.action);
    out.add(h.smallerAction);
  }
  for (const line of Object.values(COMPANION_LINES)) out.add(line);
  const edu = loadEducation();
  out.add(edu.disclaimer);
  for (const p of edu.principles) {
    for (const n of p.notes) {
      out.add(n.title);
      out.add(n.text);
      out.add(n.sourceLabel);
    }
  }
  const cat = loadCatalog();
  out.add(cat.disclaimer);
  for (const p of cat.principles) {
    for (const i of p.items) {
      out.add(i.title);
      out.add(i.smallerAction);
    }
  }
  return [...out];
}

describe("i18n compartido (BLU-1504, #126)", () => {
  it("todo el contenido del core tiene traducción en los 4 idiomas", () => {
    const missing = coreContent().flatMap((s) =>
      TARGETS.filter((l) => !hasEntry(l, s)).map((l) => `${l}: ${s}`),
    );
    expect(missing).toEqual([]);
  });

  it("castellano es la fuente y lo desconocido se conserva", () => {
    expect(translate("es", "Hoy")).toBe("Hoy");
    expect(translate("en-US", "texto inexistente xyz")).toBe("texto inexistente xyz");
  });

  it("translateWith traduce y luego rellena variables", () => {
    expect(translateWith("es", "Hola {name}", { name: "Ana" })).toBe("Hola Ana");
    expect(translateWith("es", "Sin {x}")).toBe("Sin {x}");
  });

  it("pickLocale elige el idioma soportado más cercano", () => {
    expect(pickLocale("en-GB")).toBe("en-US");
    expect(pickLocale("pt-BR")).toBe("pt-BR");
    expect(pickLocale("pt_BR")).toBe("pt-BR");
    expect(pickLocale("pt-AO")).toBe("pt-PT");
    expect(pickLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(pickLocale("es-CL")).toBe("es");
    expect(pickLocale("fr-FR")).toBe("es");
    expect(pickLocale(undefined)).toBe("es");
  });

  it("el idioma elegido persiste en el estado y valores inválidos se ignoran", () => {
    const base = { consentAcceptedAt: null, selectedHabitIds: [], checkInsByDate: {}, adaptations: [] };
    expect(decodeState(JSON.stringify({ ...base, locale: "zh-CN" })).locale).toBe("zh-CN");
    expect(decodeState(JSON.stringify({ ...base, locale: "klingon" })).locale).toBeUndefined();
    expect("locale" in createInitialState()).toBe(false);
  });
});
