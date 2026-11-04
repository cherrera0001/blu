import { clearBluState } from "./storage";
import { invalidateReviews } from "./review";
import { invalidateGoals } from "./onboarding/goals-storage";

/** Todas las claves que Blu puede escribir en el almacenamiento local. */
export const BLU_STORAGE_KEYS = [
  "blu.local.v1",
  "blu.onboarding.v1",
  "blu.goals.v1",
  "blu.review.v1",
  "blu.onboarding.notice.v1",
] as const;

export interface EraseResult {
  ok: boolean;
  /** Claves que no se pudieron eliminar o verificar. */
  remaining: string[];
}

/**
 * Borra todo el estado local de Blu y verifica cada clave.
 * No informa éxito si quedó alguna clave: las lista en `remaining`.
 * También invalida los stores en memoria de las claves borradas, también en
 * borrados parciales, para que no reaparezcan datos antiguos en la interfaz.
 */
export function eraseAllLocalData(): EraseResult {
  const remaining: string[] = [];
  try {
    if (!clearBluState()) remaining.push("blu.local.v1");
  } catch {
    remaining.push("blu.local.v1");
  }
  for (const key of BLU_STORAGE_KEYS.slice(1)) {
    try {
      window.localStorage.removeItem(key);
      if (window.localStorage.getItem(key) !== null) remaining.push(key);
    } catch {
      remaining.push(key);
    }
  }
  invalidateReviews();
  invalidateGoals();
  return { ok: remaining.length === 0, remaining };
}
