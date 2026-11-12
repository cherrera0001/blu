import { describe, expect, it } from "vitest";
import { createInitialState, decodeState } from "./blu";

const base = { consentAcceptedAt: null, selectedHabitIds: [], checkInsByDate: {}, adaptations: [] };

describe("voicePreference (specs/026 FR-005)", () => {
  it("estado inicial no fija preferencia (voz natural por defecto)", () => {
    expect(createInitialState().voicePreference).toBeUndefined();
  });

  it("conserva la preferencia «device» al guardar y releer", () => {
    const state = decodeState(JSON.stringify({ ...base, voicePreference: "device" }));
    expect(state.voicePreference).toBe("device");
    expect(decodeState(JSON.stringify(state)).voicePreference).toBe("device");
  });

  it("conserva «natural»", () => {
    expect(decodeState(JSON.stringify({ ...base, voicePreference: "natural" })).voicePreference).toBe(
      "natural",
    );
  });

  it("ignora valores desconocidos sin perder el resto de los datos", () => {
    const state = decodeState(
      JSON.stringify({ ...base, selectedHabitIds: ["rest"], voicePreference: "cloud" }),
    );
    expect(state.voicePreference).toBeUndefined();
    expect(state.selectedHabitIds).toEqual(["rest"]);
  });

  it("datos antiguos sin el campo siguen siendo válidos", () => {
    const state = decodeState(JSON.stringify(base));
    expect("voicePreference" in state).toBe(false);
  });
});
