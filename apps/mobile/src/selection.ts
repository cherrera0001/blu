import { MAX_SELECTED_HABITS, type HabitId } from "blu-core/blu";

export interface ToggleResult {
  next: HabitId[];
  blocked: boolean;
  message: string;
}

/** Alterna un tema en el borrador de onboarding (tope 4). */
export function toggleHabitSelection(
  current: readonly HabitId[],
  habitId: HabitId,
  max = MAX_SELECTED_HABITS,
): ToggleResult {
  if (current.includes(habitId)) {
    return {
      next: current.filter((id) => id !== habitId),
      blocked: false,
      message: "",
    };
  }
  if (current.length >= max) {
    return {
      next: [...current],
      blocked: true,
      message: `Solo puedes elegir hasta ${max} temas. Quita uno si quieres cambiar.`,
    };
  }
  return {
    next: [...current, habitId],
    blocked: false,
    message: "",
  };
}
