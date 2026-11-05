import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  enableReminders,
  getReminderPermission,
  loadReminderSettings,
  maybeSendReminder,
  REMINDERS_STORAGE_KEY,
  saveReminderSettings,
} from "./reminders";

const sentNotifications: Array<{ title: string; body?: string }> = [];

function mockNotification(permission: string, requestResult?: string) {
  vi.stubGlobal(
    "Notification",
    class {
      static permission = permission;
      static requestPermission = vi.fn().mockResolvedValue(requestResult ?? permission);
      constructor(title: string, options?: { body?: string }) {
        sentNotifications.push({ title, body: options?.body });
      }
    },
  );
}

function at(hour: number): Date {
  const d = new Date(2026, 10, 5, hour, 0, 0);
  return d;
}

beforeEach(() => {
  window.localStorage.clear();
  sentNotifications.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recordatorios locales opt-in (BLU-1502)", () => {
  it("permission unsupported cuando el navegador no tiene Notification", () => {
    vi.stubGlobal("Notification", undefined);
    expect(getReminderPermission()).toBe("unsupported");
  });

  it("enableReminders persiste el opt-in solo con permiso concedido", async () => {
    mockNotification("default", "granted");
    const result = await enableReminders();
    expect(result.ok).toBe(true);
    expect(loadReminderSettings().enabled).toBe(true);
    expect(window.localStorage.getItem(REMINDERS_STORAGE_KEY)).toContain('"enabled":true');
  });

  it("enableReminders con denegación no activa el recordatorio", async () => {
    mockNotification("default", "denied");
    const result = await enableReminders();
    expect(result.ok).toBe(false);
    expect(loadReminderSettings().enabled).toBe(false);
  });

  it("maybeSendReminder: no envía si está desactivado o sin permiso", () => {
    mockNotification("granted");
    expect(maybeSendReminder({ doneHabitIds: [], todayHabitIds: ["a"], now: at(10) }).outcome).toBe("disabled");
    saveReminderSettings({ enabled: true, lastPromptedDay: null });
    mockNotification("default");
    expect(maybeSendReminder({ doneHabitIds: [], todayHabitIds: ["a"], now: at(10) }).outcome).toBe("no_permission");
    expect(sentNotifications).toHaveLength(0);
  });

  it("maybeSendReminder: no envía si todos los pasos de hoy están marcados", () => {
    mockNotification("granted");
    saveReminderSettings({ enabled: true, lastPromptedDay: null });
    const result = maybeSendReminder({ doneHabitIds: ["a", "b"], todayHabitIds: ["a", "b"], now: at(10) });
    expect(result.outcome).toBe("all_done");
    expect(sentNotifications).toHaveLength(0);
  });

  it("maybeSendReminder: máximo uno al día, con texto amable y sin promesas", () => {
    mockNotification("granted");
    saveReminderSettings({ enabled: true, lastPromptedDay: null });
    const first = maybeSendReminder({ doneHabitIds: ["a"], todayHabitIds: ["a", "b"], now: at(10) });
    expect(first.outcome).toBe("sent");
    expect(sentNotifications).toHaveLength(1);
    expect(sentNotifications[0].title).toBe("Blu");
    expect(sentNotifications[0].body).toMatch(/paso pequeño/i);
    expect(sentNotifications[0].body).not.toMatch(/salud|longevidad|cura/i);
    // no repite el mismo día
    const second = maybeSendReminder({ doneHabitIds: ["a"], todayHabitIds: ["a", "b"], now: at(11) });
    expect(second.outcome).toBe("already_prompted");
    expect(sentNotifications).toHaveLength(1);
  });

  it("maybeSendReminder: respeta la hora de la mañana (no envía antes de las 9)", () => {
    mockNotification("granted");
    saveReminderSettings({ enabled: true, lastPromptedDay: null });
    const early = maybeSendReminder({ doneHabitIds: [], todayHabitIds: ["a"], now: at(8) });
    expect(early.outcome).toBe("too_early");
    expect(sentNotifications).toHaveLength(0);
  });

  it("unsupported: maybeSendReminder lo reporta sin lanzar", () => {
    vi.stubGlobal("Notification", undefined);
    saveReminderSettings({ enabled: true, lastPromptedDay: null });
    expect(maybeSendReminder({ doneHabitIds: [], todayHabitIds: ["a"], now: at(10) }).outcome).toBe("unsupported");
  });
});
