import { describe, expect, it } from "vitest";
import { createInitialState, currentAction, HABITS, type BluState } from "./blu";
import { canSimplify, isAdapted, MAX_SMALLER_OPTIONS, simplifyHabit, smallerOptions, undoLastAdaptation } from "./adapt";

const NOW = "2026-11-12T10:00:00.000Z";
const rest = HABITS.find((h) => h.id === "rest")!;

function withRest(): BluState {
  return { ...createInitialState(), selectedHabitIds: ["rest"] };
}

describe("«Probar más pequeño» (paridad web, BLU-1102)", () => {
  it("cambia la acción actual a la versión pequeña y registra el motivo", () => {
    const result = simplifyHabit(withRest(), "rest", "energy", NOW);
    expect(result.changed).toBe(true);
    expect(currentAction(result.state, "rest")).toBe(rest.smallerAction);
    expect(result.state.adaptations.at(-1)).toEqual({
      habitId: "rest",
      from: rest.action,
      to: rest.smallerAction,
      barrier: "energy",
      at: NOW,
    });
  });

  it("si ya es esa versión, no duplica el ajuste", () => {
    const once = simplifyHabit(withRest(), "rest", "time", NOW).state;
    const twice = simplifyHabit(once, "rest", "time", NOW);
    expect(twice.changed).toBe(false);
    expect(twice.state).toBe(once);
  });

  it("deshacer devuelve la versión anterior de ese hábito, sin tocar otros", () => {
    let state: BluState = { ...withRest(), selectedHabitIds: ["rest", "movement"] };
    state = simplifyHabit(state, "movement", "time", NOW).state;
    state = simplifyHabit(state, "rest", "other", NOW).state;
    const undone = undoLastAdaptation(state, "movement");
    expect(currentAction(undone, "movement")).toBe(HABITS.find((h) => h.id === "movement")!.action);
    expect(currentAction(undone, "rest")).toBe(rest.smallerAction);
    expect(isAdapted(undone, "movement")).toBe(false);
  });

  it("deshacer sin ajustes no cambia nada", () => {
    const state = withRest();
    expect(undoLastAdaptation(state, "rest")).toBe(state);
  });
});

describe("otras versiones del catálogo (ola B)", () => {
  it("ofrece como máximo 3, empezando por la versión pequeña propia, sin repetir la actual", () => {
    for (const habit of HABITS) {
      const state = { ...createInitialState(), selectedHabitIds: [habit.id] };
      const options = smallerOptions(state, habit.id, "energy");
      expect(options.length, habit.id).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(MAX_SMALLER_OPTIONS);
      expect(options[0].text).toBe(habit.smallerAction);
      expect(options.map((o) => o.text)).not.toContain(currentAction(state, habit.id));
      expect(new Set(options.map((o) => o.text)).size).toBe(options.length);
    }
  });

  it("prioriza las que alivian el motivo declarado", () => {
    const opts = smallerOptions(withRest(), "rest", "remembering");
    const catalogPart = opts.slice(1);
    expect(catalogPart.length).toBeGreaterThan(0);
  });

  it("aplica una opción del catálogo elegida", () => {
    const pick = smallerOptions(withRest(), "rest", "time")[1];
    const result = simplifyHabit(withRest(), "rest", "time", NOW, pick.text);
    expect(result.changed).toBe(true);
    expect(currentAction(result.state, "rest")).toBe(pick.text);
    expect(canSimplify(result.state, "rest")).toBe(true);
  });

  it("rechaza texto libre que no sea una opción permitida", () => {
    const result = simplifyHabit(withRest(), "rest", "time", NOW, "Correr una maratón");
    expect(result.changed).toBe(false);
  });
});
