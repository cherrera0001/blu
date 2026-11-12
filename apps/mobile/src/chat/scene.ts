import { localDateKey, type BluState, type HabitId } from "blu-core/blu";
import type { CompanionMood } from "blu-core/companion";
import { summarizeDays } from "blu-core/history";
import type { Locale } from "blu-core/i18n";

/** Forma que valida el BFF (src/lib/assistant/scene.ts). Sin texto libre. */
export interface ChatScene {
  locale: Locale;
  habitIds: HabitId[];
  todayDone: number;
  todayTotal: number;
  mood: CompanionMood;
  declared: Record<string, never>;
  observedDays: number;
}

/**
 * Escenario mínimo para que Blu responda en el idioma elegido (BLU-1504).
 * Solo identificadores de temas y conteos; sin fechas ni historial.
 * Sin temas elegidos no hay escenario válido: el BFF responde en castellano.
 */
export function buildChatScene(
  state: BluState,
  locale: Locale,
  mood: CompanionMood,
  now: Date,
): ChatScene | null {
  const habitIds = state.selectedHabitIds.slice(0, 4);
  if (habitIds.length === 0) return null;
  const today = state.checkInsByDate[localDateKey(now)] ?? [];
  return {
    locale,
    habitIds,
    todayDone: habitIds.filter((id) => today.includes(id)).length,
    todayTotal: habitIds.length,
    mood,
    declared: {},
    observedDays: summarizeDays(state, now, 14).activeDays,
  };
}
