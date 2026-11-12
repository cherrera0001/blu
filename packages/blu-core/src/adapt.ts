import { currentAction, HABITS, type Barrier, type BluState, type HabitId } from "./blu";

/**
 * «Probar más pequeño»: la persona baja la exigencia de un hábito con un motivo
 * explícito y puede deshacerlo. Nunca ocurre automáticamente (BLU-1102).
 */
export function canSimplify(state: BluState, habitId: HabitId): boolean {
  const habit = HABITS.find((h) => h.id === habitId);
  return Boolean(habit) && currentAction(state, habitId) !== habit!.smallerAction;
}

export function isAdapted(state: BluState, habitId: HabitId): boolean {
  return state.adaptations.some((a) => a.habitId === habitId);
}

export function simplifyHabit(
  state: BluState,
  habitId: HabitId,
  barrier: Barrier,
  now: string,
): { state: BluState; changed: boolean } {
  const habit = HABITS.find((h) => h.id === habitId);
  if (!habit || !canSimplify(state, habitId)) return { state, changed: false };
  return {
    changed: true,
    state: {
      ...state,
      adaptations: [
        ...state.adaptations,
        { habitId, from: currentAction(state, habitId), to: habit.smallerAction, barrier, at: now },
      ],
    },
  };
}

/** Quita el ajuste más reciente de ese hábito (no de otros). */
export function undoLastAdaptation(state: BluState, habitId: HabitId): BluState {
  let index = -1;
  for (let i = state.adaptations.length - 1; i >= 0; i -= 1) {
    if (state.adaptations[i].habitId === habitId) {
      index = i;
      break;
    }
  }
  if (index === -1) return state;
  return { ...state, adaptations: state.adaptations.filter((_, i) => i !== index) };
}
