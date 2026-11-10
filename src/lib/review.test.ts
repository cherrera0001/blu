import { beforeEach, describe, expect, it } from "vitest";
import { getISOWeekKey, getServerReviewSnapshot, saveReview, loadReviews } from "./review";

describe("review server snapshot", () => {
  it("reuses a stable empty snapshot during server rendering", () => {
    expect(getServerReviewSnapshot()).toBe(getServerReviewSnapshot());
  });
});

describe("getISOWeekKey — semana ISO determinística (SC-003, FR-004)", () => {
  it("lunes y domingo de la misma semana comparten clave", () => {
    // 2026-11-02 es lunes; 2026-11-08 es domingo
    const monday = getISOWeekKey(new Date(2026, 10, 2));
    const sunday = getISOWeekKey(new Date(2026, 10, 8));
    expect(monday).toBe(sunday);
    expect(monday).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("semanas distintas producen claves distintas", () => {
    expect(getISOWeekKey(new Date(2026, 10, 2))).not.toBe(getISOWeekKey(new Date(2026, 10, 9)));
  });

  it("es determinística para la misma fecha", () => {
    expect(getISOWeekKey(new Date(2026, 10, 4))).toBe(getISOWeekKey(new Date(2026, 10, 4)));
  });
});

describe("review storage (FR-001..FR-003)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda una revisión completa con fechas y la recupera (SC-001)", () => {
    const saved = saveReview(
      { weekKey: "2026-W45", felt: "harder", decision: "adjust" },
      "2026-11-04T12:00:00.000Z",
    );
    expect(saved.ok).toBe(true);
    const reviews = loadReviews();
    expect(reviews.error).toBeNull();
    expect(reviews.reviews).toHaveLength(1);
    expect(reviews.reviews?.[0]).toEqual({
      weekKey: "2026-W45",
      felt: "harder",
      decision: "adjust",
      updatedAt: "2026-11-04T12:00:00.000Z",
    });
  });

  it("omitir todo guarda la revisión sin respuestas y no falla (SC-002)", () => {
    const saved = saveReview({ weekKey: "2026-W45" }, "t");
    expect(saved.ok).toBe(true);
    const reviews = loadReviews();
    expect(reviews.reviews?.[0].felt).toBeUndefined();
    expect(reviews.reviews?.[0].decision).toBeUndefined();
  });

  it("segunda revisión en la misma semana actualiza la primera (FR-001)", () => {
    saveReview({ weekKey: "2026-W45", felt: "same" }, "t1");
    saveReview({ weekKey: "2026-W45", felt: "better", decision: "keep" }, "t2");
    const reviews = loadReviews();
    expect(reviews.reviews).toHaveLength(1);
    expect(reviews.reviews?.[0].felt).toBe("better");
    expect(reviews.reviews?.[0].decision).toBe("keep");
  });

  it("historial acotado a 12 semanas (FR-001)", () => {
    for (let i = 1; i <= 15; i += 1) {
      saveReview({ weekKey: `2026-W${String(i).padStart(2, "0")}` }, `t${i}`);
    }
    const reviews = loadReviews();
    expect(reviews.reviews?.length).toBeLessThanOrEqual(12);
  });

  it("estado corrupto produce error visible (FR-006 edge)", () => {
    window.localStorage.setItem("blu.review.v1", "{mal");
    const reviews = loadReviews();
    expect(reviews.reviews).toBeNull();
    expect(reviews.error).toMatch(/no se pueden leer/i);
  });

  it("sin estado no hay error ni revisiones", () => {
    const reviews = loadReviews();
    expect(reviews.reviews).toBeNull();
    expect(reviews.error).toBeNull();
  });
});
