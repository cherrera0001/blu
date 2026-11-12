import { describe, expect, it } from "vitest";
import { createInitialState, decodeState, type BluState, type HabitId } from "./blu";
import {
  answerKeep,
  decodeReminder,
  disableReminder,
  enableReminder,
  ignoredStreak,
  nextReminderAt,
  recordScheduled,
  shouldAskToKeep,
} from "./reminder";

const base = (): BluState => ({
  ...createInitialState(),
  selectedHabitIds: ["movement", "rest"],
});
const d = (iso: string) => new Date(iso);

describe("recordatorio opt-in (ADR-0010)", () => {
  it("apagado por defecto: sin preferencia no hay recordatorio", () => {
    expect(nextReminderAt(base(), d("2026-11-12T08:00:00"))).toBeNull();
  });

  it("hoy a la hora elegida si aún no pasó y faltan pasos", () => {
    const s = enableReminder(base(), 10);
    expect(nextReminderAt(s, d("2026-11-12T08:00:00"))).toEqual(d("2026-11-12T10:00:00"));
  });

  it("mañana si la hora ya pasó (máximo uno al día)", () => {
    const s = enableReminder(base(), 10);
    expect(nextReminderAt(s, d("2026-11-12T10:30:00"))).toEqual(d("2026-11-13T10:00:00"));
  });

  it("se cancela el de hoy cuando todo está marcado", () => {
    const s = { ...enableReminder(base(), 18), checkInsByDate: { "2026-11-12": ["movement", "rest"] as HabitId[] } };
    expect(nextReminderAt(s, d("2026-11-12T09:00:00"))).toEqual(d("2026-11-13T18:00:00"));
  });

  it("sin temas elegidos no hay recordatorio; apagado tampoco", () => {
    expect(nextReminderAt(enableReminder(createInitialState()), d("2026-11-12T08:00:00"))).toBeNull();
    expect(nextReminderAt(disableReminder(enableReminder(base())), d("2026-11-12T08:00:00"))).toBeNull();
  });

  it("3 días ignorados seguidos → pregunta una sola vez", () => {
    let s = enableReminder(base(), 10);
    for (const day of ["2026-11-09", "2026-11-10", "2026-11-11"]) {
      s = { ...s, reminder: recordScheduled(s.reminder!, d(`${day}T10:00:00`)) };
    }
    const now = d("2026-11-12T08:00:00");
    expect(ignoredStreak(s, now)).toBe(3);
    expect(shouldAskToKeep(s, now)).toBe(true);
    const kept = answerKeep(s, true, now);
    expect(kept.reminder?.enabled).toBe(true);
    expect(shouldAskToKeep(kept, now)).toBe(false);
    expect(answerKeep(s, false, now).reminder?.enabled).toBe(false);
  });

  it("un día con alguna marca corta la racha de ignorados", () => {
    let s = enableReminder(base(), 10);
    for (const day of ["2026-11-09", "2026-11-10", "2026-11-11"]) {
      s = { ...s, reminder: recordScheduled(s.reminder!, d(`${day}T10:00:00`)) };
    }
    s = { ...s, checkInsByDate: { "2026-11-10": ["rest"] as HabitId[] } };
    expect(ignoredStreak(s, d("2026-11-12T08:00:00"))).toBe(1);
  });

  it("decodifica de forma estricta y persiste en el estado", () => {
    expect(decodeReminder({ enabled: true, hour: 25, remindedDays: [] })).toBeNull();
    expect(decodeReminder({ enabled: "yes", hour: 9 })).toBeNull();
    const ok = decodeReminder({ enabled: true, hour: 9, remindedDays: ["2026-11-11", "x", "2026-11-11"] });
    expect(ok).toEqual({ enabled: true, hour: 9, remindedDays: ["2026-11-11"] });
    const raw = JSON.stringify({ ...base(), consentAcceptedAt: null, reminder: ok });
    expect(decodeState(raw).reminder).toEqual(ok);
  });
});
