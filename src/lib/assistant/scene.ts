import { HABITS, type HabitId } from "@/lib/blu";
import { COMPANION_MOODS, type CompanionMood } from "@/lib/companion";
import { DECLARED_LABELS, DECLARED_LEVELS, type DeclaredLevel } from "@/lib/portrait";
import { isLocale, type Locale } from "@/lib/i18n";

export interface AssistantScene {
  locale: Locale;
  habitIds: HabitId[];
  todayDone: number;
  todayTotal: number;
  mood: CompanionMood;
  declared: Partial<Record<HabitId, DeclaredLevel>>;
  observedDays: number;
}

const HABIT_IDS = new Set<string>(HABITS.map((habit) => habit.id));
const LOCALE_NAMES: Record<Locale, string> = {
  es: "español",
  "en-US": "inglés de Estados Unidos",
  "zh-CN": "chino mandarín simplificado",
};

function isHabitId(value: unknown): value is HabitId {
  return typeof value === "string" && HABIT_IDS.has(value);
}

function isMood(value: unknown): value is CompanionMood {
  return typeof value === "string" && (COMPANION_MOODS as readonly string[]).includes(value);
}

function isLevel(value: unknown): value is DeclaredLevel {
  return typeof value === "string" && (DECLARED_LEVELS as readonly string[]).includes(value);
}

/**
 * Acepta solo el escenario que la app puede demostrar. Cualquier otra forma
 * se descarta: el chat sigue, sin dejar que el texto de la persona reescriba
 * las instrucciones.
 */
export function parseAssistantScene(raw: unknown): AssistantScene | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (!isLocale(record.locale) || !isMood(record.mood)) return null;
  if (!Array.isArray(record.habitIds) || record.habitIds.length < 1 || record.habitIds.length > 4) return null;
  if (!record.habitIds.every(isHabitId) || new Set(record.habitIds).size !== record.habitIds.length) return null;
  if (!Number.isInteger(record.todayDone) || !Number.isInteger(record.todayTotal)) return null;
  if (!Number.isInteger(record.observedDays)) return null;
  const todayDone = record.todayDone as number;
  const todayTotal = record.todayTotal as number;
  const observedDays = record.observedDays as number;
  if (todayTotal !== record.habitIds.length || todayDone < 0 || todayDone > todayTotal) return null;
  if (observedDays < 0 || observedDays > 14) return null;
  if (typeof record.declared !== "object" || record.declared === null || Array.isArray(record.declared)) return null;

  const declared: AssistantScene["declared"] = {};
  for (const [key, value] of Object.entries(record.declared)) {
    if (!isHabitId(key) || !isLevel(value)) return null;
    declared[key] = value;
  }

  return {
    locale: record.locale,
    habitIds: record.habitIds,
    todayDone,
    todayTotal,
    mood: record.mood,
    declared,
    observedDays,
  };
}

export function describeScene(scene: AssistantScene): string {
  const titles = scene.habitIds.map((id) => HABITS.find((habit) => habit.id === id)?.title ?? id);
  const declared = scene.habitIds
    .filter((id) => scene.declared[id])
    .map((id) => `${HABITS.find((habit) => habit.id === id)?.title}: ${DECLARED_LABELS[scene.declared[id]!]}`);
  return [
    `Idioma de respuesta: ${LOCALE_NAMES[scene.locale]}.`,
    `Hábitos elegidos: ${titles.join(", ")}.`,
    `Hoy: ${scene.todayDone} de ${scene.todayTotal} pasos marcados. Ánimo de Blu: ${scene.mood}.`,
    declared.length > 0
      ? `Punto de partida declarado: ${declared.join("; ")}.`
      : "Aún no hay punto de partida declarado.",
    `Días con algún paso en la ventana reciente: ${scene.observedDays}.`,
  ].join(" ");
}
