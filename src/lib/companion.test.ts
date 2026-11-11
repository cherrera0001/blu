import { describe, expect, it } from "vitest";
import { createInitialState, type BluState } from "./blu";
import { readCompanion } from "./companion";

const today = new Date(2026, 10, 9, 12);

function state(partial: Partial<BluState>): BluState {
  return { ...createInitialState(), selectedHabitIds: ["movement", "rest"], ...partial };
}

describe("readCompanion", () => {
  it("espera con el avatar vivo cuando el día aún no tiene pasos", () => {
    const view = readCompanion(state({}), today);
    expect(view.mood).toBe("waiting");
    expect(view.pose).toBe("companion");
    expect(view.line).toMatch(/sin prisa/);
  });

  it("se anima con el estilo companion y celebra con builder cuando el día está completo", () => {
    const partial = readCompanion(
      state({ checkInsByDate: { "2026-11-09": ["movement"] } }),
      today,
    );
    expect(partial.mood).toBe("encouraging");
    expect(partial.pose).toBe("companion");

    const done = readCompanion(
      state({ checkInsByDate: { "2026-11-09": ["movement", "rest"] } }),
      today,
    );
    expect(done.mood).toBe("celebrate");
    expect(done.pose).toBe("builder");
  });

  it("usa la pose activa cuando varios días recientes también tuvieron un paso", () => {
    const view = readCompanion(
      state({
        checkInsByDate: {
          "2026-11-09": ["movement", "rest"],
          "2026-11-08": ["movement"],
          "2026-11-07": ["rest"],
        },
      }),
      today,
    );
    expect(view.mood).toBe("thriving");
    expect(view.pose).toBe("builder");
    expect(view.recentActiveDays).toBe(3);
  });

  it("descansa sin culpa si hace días que no hay un paso", () => {
    const view = readCompanion(state({ checkInsByDate: { "2026-11-05": ["movement"] } }), today);
    expect(view.mood).toBe("resting");
    expect(view.pose).toBe("companion");
    expect(view.line).not.toMatch(/fall|culpa|racha/i);
  });
});
