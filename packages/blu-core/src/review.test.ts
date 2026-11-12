import { describe, expect, it } from "vitest";
import { decodeReview, getISOWeekKey, MAX_REVIEWS, reviewDue, reviewForWeek, upsertReview } from "./review";

const FRI = new Date(2026, 10, 13); // viernes 13-nov-2026
const WED = new Date(2026, 10, 11);
const SUN = new Date(2026, 10, 15);

describe("revisión semanal (BLU-1202, dominio compartido)", () => {
  it("clave ISO: viernes y domingo de la misma semana comparten clave", () => {
    expect(getISOWeekKey(FRI)).toBe("2026-W46");
    expect(getISOWeekKey(SUN)).toBe(getISOWeekKey(FRI));
    expect(getISOWeekKey(new Date(2027, 0, 1))).toBe("2026-W53");
  });

  it("solo se ofrece de viernes a domingo y si no hubo respuesta", () => {
    expect(reviewDue([], WED)).toBe(false);
    expect(reviewDue([], FRI)).toBe(true);
    expect(reviewDue(undefined, SUN)).toBe(true);
    const skipped = upsertReview([], { weekKey: getISOWeekKey(FRI) }, "t");
    expect(reviewDue(skipped, SUN)).toBe(false); // «prefiero no responder» también cuenta
  });

  it("upsert reemplaza la misma semana y guarda como máximo 12", () => {
    let list = upsertReview([], { weekKey: "2026-W46", felt: "same" }, "a");
    list = upsertReview(list, { weekKey: "2026-W46", felt: "better", decision: "keep" }, "b");
    expect(list).toEqual([{ weekKey: "2026-W46", felt: "better", decision: "keep", updatedAt: "b" }]);
    for (let w = 1; w <= 20; w += 1) {
      list = upsertReview(list, { weekKey: `2026-W${String(w).padStart(2, "0")}` }, "c");
    }
    expect(list).toHaveLength(MAX_REVIEWS);
    expect(reviewForWeek(list, FRI)).toBeNull();
  });

  it("rechaza claves y valores inválidos", () => {
    expect(() => upsertReview([], { weekKey: "2026-46" }, "t")).toThrow();
    expect(() => decodeReview({ weekKey: "2026-W46", updatedAt: "t", felt: "great" })).toThrow();
  });
});

describe("weeklyReviews en BluState (móvil)", async () => {
  const { createInitialState, decodeState } = await import("./blu");
  const base = { consentAcceptedAt: null, selectedHabitIds: ["rest"], checkInsByDate: {}, adaptations: [] };

  it("se conservan al guardar y releer", () => {
    const reviews = upsertReview([], { weekKey: "2026-W46", felt: "same" }, "t");
    const state = decodeState(JSON.stringify({ ...base, weeklyReviews: reviews }));
    expect(state.weeklyReviews).toEqual(reviews);
  });

  it("una revisión dañada se descarta sin perder los hábitos", () => {
    const state = decodeState(JSON.stringify({ ...base, weeklyReviews: [{ weekKey: "x" }] }));
    expect(state.weeklyReviews).toBeUndefined();
    expect(state.selectedHabitIds).toEqual(["rest"]);
  });

  it("el estado inicial no trae el campo", () => {
    expect("weeklyReviews" in createInitialState()).toBe(false);
  });
});
