import { describe, expect, it } from "vitest";
import { acceptPurpose, emptyConsent } from "@/lib/consent";
import {
  FEEDBACK_STORAGE_KEY,
  aggregateFeedback,
  loadFeedbackLog,
  recordFeedback,
  saveFeedbackLog,
  validateFeedbackEvent,
  type FeedbackEvent,
} from "./feedback";

function consentWithMejora(): ReturnType<typeof emptyConsent> {
  return acceptPurpose(emptyConsent(), "mejora", "2026-11-06T10:00:00Z");
}

function event(overrides: Partial<FeedbackEvent> = {}): FeedbackEvent {
  return {
    id: "evt-1",
    kind: "suggestion-feedback",
    habitId: "movement",
    useful: false,
    reason: "no-era-para-mi",
    at: "2026-11-06T10:00:00Z",
    ...overrides,
  };
}

describe("recordFeedback — consentimiento «mejora» aplicado", () => {
  it("sin consentimiento de mejora se rechaza (fail-closed)", () => {
    const out = recordFeedback(
      { habitId: "movement", useful: false, reason: "no-era-para-mi" },
      emptyConsent(),
      "2026-11-06T10:00:00Z",
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe("consentimiento_requerido");
  });

  it("con consentimiento registra un evento sin contenido sensible", () => {
    const out = recordFeedback(
      { habitId: "movement", useful: false, reason: "no-era-para-mi" },
      consentWithMejora(),
      "2026-11-06T10:00:00Z",
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.event.habitId).toBe("movement");
      expect(out.event.useful).toBe(false);
      expect(out.event.reason).toBe("no-era-para-mi");
      expect(out.event.at).toBe("2026-11-06T10:00:00Z");
      // Sin campo de texto: el evento no puede contener comentarios.
      expect("comment" in out.event).toBe(false);
      expect("text" in out.event).toBe(false);
      expect(out.event.id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it("retirar el consentimiento bloquea nuevos eventos", () => {
    const withMejora = consentWithMejora();
    const without = {
      ...withMejora,
      purposes: { operativo: withMejora.purposes.mejora! },
    };
    const out = recordFeedback(
      { habitId: "movement", useful: true },
      without,
      "2026-11-06T10:00:00Z",
    );
    expect(out.ok).toBe(false);
  });

  it("feedback positivo (útil) también se registra", () => {
    const out = recordFeedback(
      { habitId: "rest", useful: true },
      consentWithMejora(),
      "2026-11-06T11:00:00Z",
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.event.useful).toBe(true);
      expect(out.event.reason).toBeNull();
    }
  });
});

describe("validateFeedbackEvent — auditoría anti-contenido sensible", () => {
  it("rechaza eventos que intenten llevar texto libre", () => {
    const withComment = { ...event(), comment: "me sentí juzgado" } as Record<string, unknown>;
    const result = validateFeedbackEvent(withComment);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/texto libre|comment/);
  });

  it("rechaza razones fuera del catálogo estructurado", () => {
    const result = validateFeedbackEvent({ ...event(), reason: "la verdad es que..." });
    expect(result.ok).toBe(false);
  });
});

describe("aggregateFeedback — agregación mínima", () => {
  it("cuenta por utilidad, razón y hábito sin exponer eventos individuales", () => {
    const events = [
      event({ id: "a", habitId: "movement", useful: false, reason: "no-era-para-mi" }),
      event({ id: "b", habitId: "movement", useful: false, reason: "no-era-para-mi" }),
      event({ id: "c", habitId: "movement", useful: true, reason: null }),
      event({ id: "d", habitId: "rest", useful: false, reason: "no-pude-hacerlo" }),
    ];
    const agg = aggregateFeedback(events);
    expect(agg.total).toBe(4);
    expect(agg.useful).toBe(1);
    expect(agg.notUseful).toBe(3);
    expect(agg.byReason["no-era-para-mi"]).toBe(2);
    expect(agg.byReason["no-pude-hacerlo"]).toBe(1);
    expect(agg.byHabitId.movement).toEqual({ useful: 1, notUseful: 2 });
    expect(agg.byHabitId.rest).toEqual({ useful: 0, notUseful: 1 });
  });
});

describe("persistencia local del log de feedback", () => {
  it("redondeo guardar/cargar", () => {
    const log = [event({ id: "a" }), event({ id: "b", habitId: "rest" })];
    expect(saveFeedbackLog(log).ok).toBe(true);
    const loaded = loadFeedbackLog();
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.events).toHaveLength(2);
  });

  it("log corrupto → error estable, no el mensaje del motor JSON", () => {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, "{no-es-json");
    const loaded = loadFeedbackLog();
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("log_corrupto");
  });
});
