import type { BluState } from "./blu";

/**
 * Recordatorio móvil opt-in (ADR-0010, BLU-1502). Lógica pura: qué hora
 * programar, cuándo no molestar y cuándo preguntar si se quiere mantener.
 * Nada de esto sale del teléfono.
 */
export interface ReminderPreference {
  enabled: boolean;
  /** Hora local elegida (0–23). */
  hour: number;
  /** Días (YYYY-MM-DD) para los que se programó un recordatorio; máx. 14. */
  remindedDays: string[];
  /** Cuándo se preguntó, una sola vez, si mantenerlo tras ignorarlo. */
  keepAskedAt?: string;
}

export const REMINDER_HOURS = [9, 10, 12, 18, 20] as const;
export const DEFAULT_REMINDER_HOUR = 10;
export const IGNORED_DAYS_TO_ASK = 3;
const MAX_REMINDED_DAYS = 14;

/** Copy fijo y sin culpa (ADR-0010 regla 3). Castellano = clave de traducción. */
export const REMINDER_TITLE = "Blu";
export const REMINDER_BODY = "Blu está por aquí si quieres dar un paso pequeño hoy.";

function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function shift(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function at(date: Date, hour: number): Date {
  const out = new Date(date);
  out.setHours(hour, 0, 0, 0);
  return out;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function decodeReminder(raw: unknown): ReminderPreference | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled !== "boolean") return null;
  if (!Number.isInteger(r.hour) || (r.hour as number) < 0 || (r.hour as number) > 23) return null;
  const days = Array.isArray(r.remindedDays)
    ? r.remindedDays.filter((d): d is string => typeof d === "string" && DAY_RE.test(d))
    : [];
  return {
    enabled: r.enabled,
    hour: r.hour as number,
    remindedDays: [...new Set(days)].sort().slice(-MAX_REMINDED_DAYS),
    ...(typeof r.keepAskedAt === "string" ? { keepAskedAt: r.keepAskedAt } : {}),
  };
}

function allDoneOn(state: BluState, key: string): boolean {
  const ids = state.selectedHabitIds;
  if (ids.length === 0) return false;
  const done = state.checkInsByDate[key] ?? [];
  return ids.every((id) => done.includes(id));
}

/**
 * Próximo recordatorio: hoy a la hora elegida si aún no pasó y quedan pasos
 * sin marcar; si no, mañana. Máximo uno al día (regla 2). Sin temas, nada.
 */
export function nextReminderAt(state: BluState, now: Date): Date | null {
  const pref = state.reminder;
  if (!pref?.enabled || state.selectedHabitIds.length === 0) return null;
  const today = at(now, pref.hour);
  if (now < today && !allDoneOn(state, dayKey(now))) return today;
  return at(shift(now, 1), pref.hour);
}

/** Registra el día programado (para detectar recordatorios ignorados). */
export function recordScheduled(pref: ReminderPreference, fireAt: Date): ReminderPreference {
  const days = [...new Set([...pref.remindedDays, dayKey(fireAt)])].sort();
  return { ...pref, remindedDays: days.slice(-MAX_REMINDED_DAYS) };
}

/** Días seguidos (hasta ayer) con recordatorio programado y ninguna marca. */
export function ignoredStreak(state: BluState, now: Date): number {
  const days = new Set(state.reminder?.remindedDays ?? []);
  let streak = 0;
  for (let offset = 1; offset <= MAX_REMINDED_DAYS; offset += 1) {
    const key = dayKey(shift(now, -offset));
    if (!days.has(key) || (state.checkInsByDate[key]?.length ?? 0) > 0) break;
    streak += 1;
  }
  return streak;
}

/** Regla 5: tras 3 días ignorados, preguntar una sola vez si mantenerlo. */
export function shouldAskToKeep(state: BluState, now: Date): boolean {
  const pref = state.reminder;
  if (!pref?.enabled || pref.keepAskedAt) return false;
  return ignoredStreak(state, now) >= IGNORED_DAYS_TO_ASK;
}

export function enableReminder(state: BluState, hour = DEFAULT_REMINDER_HOUR): BluState {
  const prev = state.reminder;
  return {
    ...state,
    reminder: { enabled: true, hour, remindedDays: prev?.remindedDays ?? [] },
  };
}

export function disableReminder(state: BluState): BluState {
  if (!state.reminder) return state;
  return { ...state, reminder: { ...state.reminder, enabled: false } };
}

/** Respuesta a la pregunta única: mantener (no se vuelve a preguntar) o apagar. */
export function answerKeep(state: BluState, keep: boolean, now: Date): BluState {
  if (!state.reminder) return state;
  return {
    ...state,
    reminder: { ...state.reminder, enabled: keep, keepAskedAt: now.toISOString() },
  };
}
