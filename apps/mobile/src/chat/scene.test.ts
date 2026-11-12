import { describe, expect, it } from "vitest";
import { createInitialState } from "blu-core/blu";
import { buildChatScene } from "./scene";

const now = new Date(2026, 10, 12, 10);

describe("buildChatScene (BLU-1504)", () => {
  it("envía idioma, temas y conteos; nada de texto libre", () => {
    const state = {
      ...createInitialState(),
      selectedHabitIds: ["movement", "rest"] as const,
      checkInsByDate: { "2026-11-12": ["rest"], "2026-11-05": ["movement"] },
    };
    const scene = buildChatScene(
      { ...state, selectedHabitIds: [...state.selectedHabitIds] } as never,
      "pt-BR",
      "encouraging",
      now,
    );
    expect(scene).toEqual({
      locale: "pt-BR",
      habitIds: ["movement", "rest"],
      todayDone: 1,
      todayTotal: 2,
      mood: "encouraging",
      declared: {},
      observedDays: 2,
    });
  });

  it("sin temas no hay escenario", () => {
    expect(buildChatScene(createInitialState(), "en-US", "waiting", now)).toBeNull();
  });
});
