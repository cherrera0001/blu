import { describe, expect, it } from "vitest";
import { loadCatalog, pickMicrohabit, validateCatalog, type HabitCatalog } from "./habit-catalog";
import catalogJson from "@/data/habits/catalog.json";

describe("validateCatalog — política editorial (BLU-301/401/501/601/701/801/901)", () => {
  it("acepta el catálogo empaquetado con 7 principios y al menos 3 items por principio", () => {
    const catalog = loadCatalog();
    expect(catalog.principles).toHaveLength(7);
    for (const p of catalog.principles) {
      expect(p.items.length).toBeGreaterThanOrEqual(3);
    }
    const total = catalog.principles.reduce((n, p) => n + p.items.length, 0);
    expect(total).toBe(28);
  });

  it("rechaza un principio con menos de 3 items", () => {
    const raw = JSON.parse(JSON.stringify(catalogJson)) as HabitCatalog;
    raw.principles[0].items = raw.principles[0].items.slice(0, 2);
    expect(() => validateCatalog(raw)).toThrow(/3 microhábitos/);
  });

  it("rechaza ids duplicados", () => {
    const raw = JSON.parse(JSON.stringify(catalogJson)) as HabitCatalog;
    raw.principles[1].items[0].id = raw.principles[0].items[0].id;
    expect(() => validateCatalog(raw)).toThrow(/duplicado/);
  });

  it("rechaza términos clínicos (política editorial)", () => {
    const raw = JSON.parse(JSON.stringify(catalogJson)) as HabitCatalog;
    raw.principles[0].items[0].action = "Toma esta medicación para tu ansiedad.";
    expect(() => validateCatalog(raw)).toThrow(/clínicos/);
  });

  it("rechaza acciones fuera de rango o sin barrera declarada", () => {
    const raw = JSON.parse(JSON.stringify(catalogJson)) as HabitCatalog;
    raw.principles[0].items[0].action = "corto";
    expect(() => validateCatalog(raw)).toThrow(/acción inválida/);
    const raw2 = JSON.parse(JSON.stringify(catalogJson)) as HabitCatalog;
    raw2.principles[0].items[0].barriers = [];
    expect(() => validateCatalog(raw2)).toThrow(/barrera/);
  });
});

describe("pickMicrohabit — selección determinista por barrera", () => {
  const catalog = loadCatalog();

  it("elige el primer item que alivia la barrera declarada", () => {
    const item = pickMicrohabit(catalog, "movement", ["time"]);
    expect(item).not.toBeNull();
    expect(item!.barriers).toContain("time");
  });

  it("cae en el primer item si ninguna barrera coincide", () => {
    const mini: HabitCatalog = {
      catalogVersion: "t",
      locale: "t",
      disclaimer: "t",
      principles: [
        {
          principleId: "movement",
          items: [
            { id: "a", title: "A", action: "Acción válida uno", smallerAction: "Versión válida uno", barriers: ["time"] },
            { id: "b", title: "B", action: "Acción válida dos", smallerAction: "Versión válida dos", barriers: ["energy"] },
            { id: "c", title: "C", action: "Acción válida tres", smallerAction: "Versión válida tres", barriers: ["remembering"] },
          ],
        },
      ],
    };
    const item = pickMicrohabit(mini, "movement", ["other"]);
    expect(item!.id).toBe("a");
  });

  it("devuelve null para principio desconocido", () => {
    expect(pickMicrohabit(catalog, "nope", ["time"])).toBeNull();
  });
});
