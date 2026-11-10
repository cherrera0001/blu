import { describe, expect, it } from "vitest";
import { createInitialState, decodeState, type BluState } from "./blu";
import { summarizeDays } from "./history";

function stateWith(checkInsByDate: Record<string, string[]>): BluState {
  return decodeState(
    JSON.stringify({ ...createInitialState(), consentAcceptedAt: "t", checkInsByDate }),
  );
}

const TODAY = new Date(2026, 10, 4); // 2026-11-04

describe("summarizeDays — panel descriptivo (BLU-1201)", () => {
  it("cuenta acciones por fecha en el período solicitado", () => {
    const state = stateWith({
      "2026-11-04": ["movement", "rest"],
      "2026-11-03": ["movement"],
      "2026-10-15": ["family"], // fuera de 7 días
    });
    const summary = summarizeDays(state, TODAY, 7);
    expect(summary.periodDays).toBe(7);
    expect(summary.days).toHaveLength(7);
    expect(summary.totalActions).toBe(3);
    expect(summary.activeDays).toBe(2);
    const last = summary.days[summary.days.length - 1];
    expect(last.date).toBe("2026-11-04");
    expect(last.count).toBe(2);
  });

  it("período de 30 días incluye fechas antiguas", () => {
    const state = stateWith({ "2026-10-15": ["family"] });
    const summary = summarizeDays(state, TODAY, 30);
    expect(summary.days).toHaveLength(30);
    expect(summary.totalActions).toBe(1);
    expect(summary.days.some((d) => d.date === "2026-10-15" && d.count === 1)).toBe(true);
  });

  it("estado vacío: totales cero sin errores", () => {
    const summary = summarizeDays(stateWith({}), TODAY, 7);
    expect(summary.totalActions).toBe(0);
    expect(summary.activeDays).toBe(0);
  });

  it("es determinista para la misma entrada", () => {
    const state = stateWith({ "2026-11-04": ["movement"] });
    expect(summarizeDays(state, TODAY, 14)).toEqual(summarizeDays(state, TODAY, 14));
  });
});
