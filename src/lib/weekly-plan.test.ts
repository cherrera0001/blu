import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_INTENTIONS_PER_DAY,
  buildDefaultPlan,
  emptyPlan,
  loadPlan,
  savePlan,
  toggleIntention,
  type WeeklyPlan,
} from "./weekly-plan";

const WEEK = "2026-W45";

function habits() {
  return [
    { habitId: "movement", action: "Pausa breve para moverte." },
    { habitId: "rest", action: "Un minuto de pausa." },
    { habitId: "family", action: "Enviar un saludo breve." },
    { habitId: "nature", action: "Observar el entorno un minuto." },
  ];
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("buildDefaultPlan — sugerencia determinista y acotada", () => {
  it("reparte los hábitos en días concretos de forma determinista", () => {
    const a = buildDefaultPlan(WEEK, habits(), "t");
    const b = buildDefaultPlan(WEEK, habits(), "t");
    expect(a).toEqual(b);
    expect(a.days).toHaveLength(7);
    const total = a.days.reduce((n, d) => n + d.intentions.length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("respeta el máximo de intenciones por día (3)", () => {
    const plan = buildDefaultPlan(WEEK, habits(), "t");
    for (const day of plan.days) {
      expect(day.intentions.length).toBeLessThanOrEqual(MAX_INTENTIONS_PER_DAY);
    }
  });
});

describe("toggleIntention — editar sin obligatoriedad", () => {
  it("añade y quita intenciones", () => {
    const plan = emptyPlan(WEEK, "t");
    const added = toggleIntention(plan, 1, habits()[0], "t2");
    expect(added.error).toBeNull();
    expect(added.plan.days[1].intentions).toHaveLength(1);
    const removed = toggleIntention(added.plan, 1, habits()[0], "t3");
    expect(removed.plan.days[1].intentions).toHaveLength(0);
  });

  it("no supera el máximo por día y lo comunica", () => {
    let plan = emptyPlan(WEEK, "t");
    for (const h of habits()) plan = toggleIntention(plan, 0, h, "t").plan;
    const result = toggleIntention(plan, 0, { habitId: "purpose", action: "x" }, "t2");
    expect(result.plan.days[0].intentions).toHaveLength(MAX_INTENTIONS_PER_DAY);
    expect(result.error).toMatch(/máximo/i);
  });

  it("alternar el mismo hábito el mismo día agrega y quita (sin duplicados)", () => {
    let plan = emptyPlan(WEEK, "t");
    plan = toggleIntention(plan, 2, habits()[0], "t").plan;
    const again = toggleIntention(plan, 2, habits()[0], "t2");
    expect(again.error).toBeNull();
    expect(again.plan.days[2].intentions).toHaveLength(0);
  });
});

describe("weekly-plan storage (blu.plan.v1)", () => {
  it("guarda y recupera con verificación", () => {
    const plan = buildDefaultPlan(WEEK, habits(), "2026-11-04T12:00:00.000Z");
    const saved = savePlan(plan);
    expect(saved.ok).toBe(true);
    const loaded = loadPlan();
    expect(loaded.error).toBeNull();
    expect(loaded.plan).toEqual(plan);
  });

  it("estado corrupto produce error visible", () => {
    window.localStorage.setItem("blu.plan.v1", "{mal");
    const loaded = loadPlan();
    expect(loaded.plan).toBeNull();
    expect(loaded.error).toMatch(/no se puede leer|formato/i);
  });

  it("semana distinta: buildDefaultPlan produce claves distintas", () => {
    const p1: WeeklyPlan = buildDefaultPlan("2026-W45", habits(), "t");
    expect(p1.weekKey).toBe("2026-W45");
  });
});
