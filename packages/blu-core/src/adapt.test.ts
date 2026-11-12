import { describe, expect, it } from "vitest";
import { createInitialState, currentAction, HABITS, type BluState } from "./blu";
import { canSimplify, isAdapted, simplifyHabit, undoLastAdaptation } from "./adapt";

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

  it("si ya es la versión pequeña, no duplica el ajuste", () => {
    const once = simplifyHabit(withRest(), "rest", "time", NOW).state;
    const twice = simplifyHabit(once, "rest", "time", NOW);
    expect(twice.changed).toBe(false);
    expect(twice.state).toBe(once);
    expect(canSimplify(once, "rest")).toBe(false);
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
