import { describe, expect, it } from "vitest";
import {
  currentAction,
  createInitialState,
  decodeState,
  getWeeklySummary,
  isBarrier,
  localDateKey,
  type BluState,
} from "./blu";
import { respondToMessage } from "./conversation";

describe("decodeState", () => {
  it("creates a fresh state when nothing is stored", () => {
    expect(decodeState(null)).toEqual(createInitialState());
  });

  it("rejects malformed JSON instead of silently resetting it", () => {
    expect(() => decodeState("{broken")).toThrow("no se pueden leer");
  });

  it("rejects unknown habits and more than three selections", () => {
    const invalidStates = [
      { consentAcceptedAt: null, selectedHabitIds: ["unknown"], checkInsByDate: {}, adaptations: [] },
      {
        consentAcceptedAt: null,
        selectedHabitIds: ["movement", "rest", "family", "purpose"],
        checkInsByDate: {},
        adaptations: [],
      },
    ];

    for (const invalidState of invalidStates) {
      expect(() => decodeState(JSON.stringify(invalidState))).toThrow("formato esperado");
    }
  });

  it("removes duplicate check-in ids while preserving valid data", () => {
    const state = decodeState(
      JSON.stringify({
        consentAcceptedAt: "2026-11-04T12:00:00.000Z",
        selectedHabitIds: ["movement"],
        checkInsByDate: { "2026-11-04": ["movement", "movement"] },
        adaptations: [],
      }),
    );

    expect(state.checkInsByDate["2026-11-04"]).toEqual(["movement"]);
  });
});

describe("weekly summary", () => {
  it("counts only actions recorded today and in the preceding six local days", () => {
    const today = new Date(2026, 10, 4, 12);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const state: BluState = {
      ...createInitialState(),
      checkInsByDate: {
        [localDateKey(today)]: ["movement", "rest"],
        [localDateKey(yesterday)]: ["family"],
        [localDateKey(sevenDaysAgo)]: ["purpose"],
      },
    };

    expect(getWeeklySummary(state, today)).toEqual({ actionsCompleted: 3, activeDays: 2 });
  });
});

describe("adaptations and bounded inputs", () => {
  it("uses the latest explicit adaptation for a habit", () => {
    const state: BluState = {
      ...createInitialState(),
      adaptations: [
        {
          habitId: "movement",
          from: "Elegir una pausa breve para moverte.",
          to: "Caminar cinco minutos.",
          barrier: "time",
          at: "2026-11-02T12:00:00.000Z",
        },
        {
          habitId: "movement",
          from: "Caminar cinco minutos.",
          to: "Cambiar de postura dos minutos.",
          barrier: "energy",
          at: "2026-11-03T12:00:00.000Z",
        },
      ],
    };

    expect(currentAction(state, "movement")).toBe("Cambiar de postura dos minutos.");
  });

  it("accepts only known adaptation reasons", () => {
    expect(isBarrier("time")).toBe(true);
    expect(isBarrier("medical")).toBe(false);
  });
});

describe("bounded conversation", () => {
  it("redirects health questions instead of offering clinical advice", async () => {
    expect(await respondToMessage("¿Qué dosis debería tomar?")).toContain(
      "No puedo evaluar síntomas ni orientar tratamientos",
    );
  });

  it("responds to time barriers without blame", async () => {
    const reply = await respondToMessage("Estoy ocupada y no tengo tiempo");
    expect(reply).toContain("No asumiré qué necesitas");
    expect(reply).not.toContain("fallo");
  });
});
