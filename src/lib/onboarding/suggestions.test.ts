import { beforeEach, describe, expect, it, vi } from "vitest";
import { HABITS } from "@/lib/blu";
import { validateBank } from "./bank";
import { answerQuestion, createAssessment, skipQuestion, type Assessment } from "./engine";
import { scoreAssessment, type Profile } from "./scoring";
import { suggestGoals } from "./suggestions";
import {
  acceptSuggestion,
  clearGoalDecisions,
  loadGoalDecisions,
  rejectSuggestion,
  emptyDecisions,
  type GoalDecisions,
} from "./goals-storage";
import bankJson from "@/data/onboarding/bank.json";

const bank = validateBank(bankJson);

/** Perfil con niveles controlados: todos los valores iguales a `value` excepto overrides por principio. */
function profileWith(overrides: Record<string, number | "skip"> = {}): {
  assessment: Assessment;
  profile: Profile;
} {
  let a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
  for (const p of bank.principles) {
    const override = overrides[p.id];
    for (const q of p.questions) {
      if (a.answers[q.id]) continue;
      try {
        if (override === "skip") {
          if (q.skippable) a = skipQuestion(bank, a, q.id);
          continue;
        }
        const v = override ?? 2;
        a = answerQuestion(bank, a, q.id, q.type === "multi_choice" ? [q.options![0].value] : v);
      } catch {
        /* omitida por regla */
      }
    }
  }
  return { assessment: a, profile: scoreAssessment(bank, a) };
}

beforeEach(() => {
  window.localStorage.clear();
  clearGoalDecisions();
});

describe("suggestGoals — reglas del motor (FR-001..FR-004)", () => {
  it("genera máximo 3 sugerencias ordenadas por nivel ascendente", () => {
    const { assessment, profile } = profileWith({ movement: 0, nourishment: 1, rest: 0, family: 3 });
    const suggestions = suggestGoals(bank, assessment, profile);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    expect(suggestions[0].principleId).toBe("movement"); // 0 (empata con rest; orden del banco)
    const scores = profile.results.map((r) => r.score);
    const suggestedScores = suggestions.map((s) => profile.results.find((r) => r.principleId === s.principleId)!.score!);
    for (let i = 1; i < suggestedScores.length; i += 1) {
      expect(suggestedScores[i]).toBeGreaterThanOrEqual(suggestedScores[i - 1]);
    }
    void scores;
  });

  it("excluye principios sin nivel (todo omitido)", () => {
    const { assessment, profile } = profileWith({
      movement: "skip",
      nourishment: "skip",
      rest: "skip",
      family: "skip",
      community: "skip",
      nature: "skip",
      purpose: "skip",
    });
    const suggestions = suggestGoals(bank, assessment, profile);
    expect(suggestions).toEqual([]);
  });

  it("cada sugerencia trae principio, acción y explicación no vacía", () => {
    const { assessment, profile } = profileWith({ movement: 1 });
    for (const s of suggestGoals(bank, assessment, profile)) {
      expect(s.id).toBe(`sug-${s.principleId}`);
      expect(HABITS.some((h) => h.id === s.habitId)).toBe(true);
      expect(s.action.length).toBeGreaterThan(0);
      expect(s.explanation.length).toBeGreaterThan(20);
      expect(s.explanation).toContain(s.title);
    }
  });

  it("con barrera de tiempo/energía sugiere la versión mínima y lo explica", () => {
    let a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
    a = answerQuestion(bank, a, "mov-01", 2);
    a = answerQuestion(bank, a, "mov-02", 2);
    a = answerQuestion(bank, a, "mov-03", ["time"]); // barrera: tiempo
    a = answerQuestion(bank, a, "mov-04", 2);
    a = answerQuestion(bank, a, "mov-05", 2);
    const profile = scoreAssessment(bank, a);
    const suggestion = suggestGoals(bank, a, profile).find((s) => s.principleId === "movement")!;
    const habit = HABITS.find((h) => h.id === "movement")!;
    expect(suggestion.action).toBe(habit.smallerAction);
    expect(suggestion.explanation.toLowerCase()).toMatch(/tiempo/);
  });

  it("es determinista: misma entrada → misma salida", () => {
    const { assessment, profile } = profileWith({ rest: 1, family: 0 });
    expect(suggestGoals(bank, assessment, profile)).toEqual(suggestGoals(bank, assessment, profile));
  });
});

describe("goals-storage — decisiones (FR-005, FR-007)", () => {
  const base = profileWith({ movement: 0 });
  const suggestion = suggestGoals(bank, base.assessment, base.profile)[0];

  it("aceptar persiste con trazabilidad y verifica escritura", () => {
    const result = acceptSuggestion(suggestion, base.profile.computedAt, "2026-11-04T10:00:00.000Z");
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    const decisions = result.decisions;
    expect(decisions.accepted).toHaveLength(1);
    expect(decisions.accepted[0].suggestionId).toBe(suggestion.id);
    expect(decisions.accepted[0].decidedAt).toBe("2026-11-04T10:00:00.000Z");
    const loaded = loadGoalDecisions();
    expect(loaded.error).toBeNull();
    expect(loaded.decisions?.accepted[0].habitId).toBe(suggestion.habitId);
  });

  it("rechazar queda registrado y no pasa a aceptados", () => {
    let d: GoalDecisions = { ...emptyDecisions(), profileComputedAt: base.profile.computedAt };
    const result = rejectSuggestion(d, suggestion.id, base.profile.computedAt, "2026-11-04T10:01:00.000Z");
    expect(result.ok).toBe(true);
    d = result.decisions;
    expect(d.rejected).toContain(suggestion.id);
    expect(d.accepted).toEqual([]);
  });

  it("propaga el fallo de almacenamiento sin marcar como persistido", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const result = acceptSuggestion(suggestion, base.profile.computedAt, "t");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no pudo guardar/i);
    expect(window.localStorage.getItem("blu.goals.v1")).toBeNull();
    spy.mockRestore();
  });

  it("estado corrupto produce error visible", () => {
    window.localStorage.setItem("blu.goals.v1", "{mal");
    const loaded = loadGoalDecisions();
    expect(loaded.decisions).toBeNull();
    expect(loaded.error).toMatch(/no se pueden leer/i);
  });

  it("clear elimina la clave", () => {
    acceptSuggestion(suggestion, base.profile.computedAt, "t");
    expect(clearGoalDecisions()).toBe(true);
    expect(window.localStorage.getItem("blu.goals.v1")).toBeNull();
  });
});
