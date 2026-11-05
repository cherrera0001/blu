export const REMINDERS_STORAGE_KEY = "blu.reminders.v1";

const PROMPT_HOUR = 9; // hora local a partir de la cual se permite el recordatorio amable

export interface ReminderSettings {
  enabled: boolean;
  /** Día (local) del último recordatorio enviado; máximo uno por día. */
  lastPromptedDay: string | null;
}

export function subscribeReminders(onStoreChange: () => void): () => void {
  void onStoreChange;
  return () => {};
}

export type ReminderPermission = "granted" | "denied" | "default" | "unsupported";

export type ReminderOutcome =
  | "sent"
  | "all_done"
  | "already_prompted"
  | "too_early"
  | "disabled"
  | "no_permission"
  | "unsupported";

function dayKey(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function notificationApi(): (typeof Notification) | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return window.Notification;
}

export function loadReminderSettings(): ReminderSettings {
  if (typeof window === "undefined") return { enabled: false, lastPromptedDay: null };
  try {
    const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return { enabled: false, lastPromptedDay: null };
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      enabled: parsed.enabled === true,
      lastPromptedDay: typeof parsed.lastPromptedDay === "string" ? parsed.lastPromptedDay : null,
    };
  } catch {
    return { enabled: false, lastPromptedDay: null };
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(settings));
}

export function getReminderPermission(): ReminderPermission {
  const api = notificationApi();
  if (!api) return "unsupported";
  return api.permission;
}

/**
 * Activa el recordatorio pidiendo permiso al navegador. Solo persiste el opt-in
 * si el permiso queda concedido; la denegación no activa nada.
 */
export async function enableReminders(): Promise<{ ok: boolean }> {
  const api = notificationApi();
  if (!api) return { ok: false };
  const permission = await api.requestPermission();
  if (permission !== "granted") return { ok: false };
  saveReminderSettings({ ...loadReminderSettings(), enabled: true });
  return { ok: true };
}

export function disableReminders(): void {
  saveReminderSettings({ enabled: false, lastPromptedDay: loadReminderSettings().lastPromptedDay });
}

/**
 * Envía como máximo un recordatorio al día, solo si quedan pasos de hoy sin
 * marcar, con opt-in activo y permiso concedido. El texto es amable y sin
 * promesas de salud. Sin servidor, sin cuenta: todo ocurre en el navegador.
 */
export function maybeSendReminder(options: {
  todayHabitIds: string[];
  doneHabitIds: string[];
  now?: Date;
}): { outcome: ReminderOutcome } {
  const api = notificationApi();
  if (!api) return { outcome: "unsupported" };
  const settings = loadReminderSettings();
  if (!settings.enabled) return { outcome: "disabled" };
  if (api.permission !== "granted") return { outcome: "no_permission" };

  const now = options.now ?? new Date();
  if (now.getHours() < PROMPT_HOUR) return { outcome: "too_early" };

  const today = dayKey(now);
  if (settings.lastPromptedDay === today) return { outcome: "already_prompted" };

  const pending = options.todayHabitIds.filter((id) => !options.doneHabitIds.includes(id));
  if (pending.length === 0) return { outcome: "all_done" };

  new api("Blu", {
    body: "¿Un paso pequeño hoy? El que tú elijas.",
    tag: "blu-reminder",
  });
  saveReminderSettings({ enabled: true, lastPromptedDay: today });
  return { outcome: "sent" };
}
