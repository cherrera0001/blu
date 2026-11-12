import { currentAction, HABITS, type Barrier, type BluState, type HabitId } from "./blu";
import { loadCatalog } from "./habit-catalog";

/**
 * «Probar más pequeño»: la persona baja la exigencia de un hábito con un motivo
 * explícito, elige entre pocas versiones menores y puede deshacerlo. Nunca
 * ocurre automáticamente (BLU-1102).
 */
export interface SmallerOption {
  id: string;
  title: string;
  text: string;
}

/** Tope deliberado: más opciones = más carga cognitiva. */
export const MAX_SMALLER_OPTIONS = 3;

function allowedOptions(habitId: HabitId, barrier?: Barrier): SmallerOption[] {
  const habit = HABITS.find((h) => h.id === habitId);
  if (!habit) return [];
  const own: SmallerOption = { id: `${habitId}-smaller`, title: "La versión más pequeña", text: habit.smallerAction };
  const items = loadCatalog().principles.find((p) => p.principleId === habitId)?.items ?? [];
  // Primero las que alivian el motivo declarado; luego el resto, en orden estable.
  const ranked = barrier
    ? [...items.filter((i) => i.barriers.includes(barrier)), ...items.filter((i) => !i.barriers.includes(barrier))]
    : items;
  return [own, ...ranked.map((i) => ({ id: i.id, title: i.title, text: i.smallerAction }))];
}

export function smallerOptions(state: BluState, habitId: HabitId, barrier?: Barrier): SmallerOption[] {
  const current = currentAction(state, habitId);
  const seen = new Set<string>([current]);
  const out: SmallerOption[] = [];
  for (const option of allowedOptions(habitId, barrier)) {
    if (seen.has(option.text)) continue;
    seen.add(option.text);
    out.push(option);
    if (out.length === MAX_SMALLER_OPTIONS) break;
  }
  return out;
}

export function canSimplify(state: BluState, habitId: HabitId): boolean {
  return smallerOptions(state, habitId).length > 0;
}

export function isAdapted(state: BluState, habitId: HabitId): boolean {
  return state.adaptations.some((a) => a.habitId === habitId);
}

/**
 * Aplica una versión menor. `to` debe ser una de las opciones permitidas para
 * ese hábito (nunca texto libre); por defecto, la versión más pequeña propia.
 */
export function simplifyHabit(
  state: BluState,
  habitId: HabitId,
  barrier: Barrier,
  now: string,
  to?: string,
): { state: BluState; changed: boolean } {
  const habit = HABITS.find((h) => h.id === habitId);
  if (!habit) return { state, changed: false };
  const target = to ?? habit.smallerAction;
  const allowed = allowedOptions(habitId).some((o) => o.text === target);
  if (!allowed || target === currentAction(state, habitId)) return { state, changed: false };
  return {
    changed: true,
    state: {
      ...state,
      adaptations: [
        ...state.adaptations,
        { habitId, from: currentAction(state, habitId), to: target, barrier, at: now },
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
