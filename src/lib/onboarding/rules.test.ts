import { describe, expect, it } from "vitest";
import { HABITS } from "@/lib/blu";
import { validateBank } from "./bank";
import { answerQuestion, createAssessment, skipQuestion, type Assessment } from "./engine";
import { scoreAssessment, type Profile } from "./scoring";
import { recommend, BUILT_IN_RULES } from "./rules";
import { suggestGoals } from "./suggestions";
import bankJson from "@/data/onboarding/bank.json";

const bank = validateBank(bankJson);

function profileWith(
  overrides: Record<string, number | "skip"> = {},
  options: { withoutBarriers?: boolean } = {},
): {
  assessment: Assessment;
  profile: Profile;
} {
  let a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
  for (const p of bank.principles) {
    const override = overrides[p.id];
    for (const q of p.questions) {
      if (a.answers[q.id]) continue;
      try {
        if (override === "skip" || (options.withoutBarriers && q.type === "multi_choice")) {
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

describe("rules engine (BLU-1101)", () => {
  it("R1: prioriza principios con banda más baja y limita a 3", () => {
    const { assessment, profile } = profileWith(
      { movement: 0, nourishment: 1, rest: 0, family: 3 },
      { withoutBarriers: true },
    );
    const recs = recommend(bank, assessment, profile);
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs[0].principleId).toBe("movement");
    expect(recs[0].ruleId).toBe("R1-banda-baja");
  });

  it("R2: barrera de tiempo/energía selecciona la versión mínima", () => {
    let a = createAssessment(bank, "t");
    a = answerQuestion(bank, a, "mov-01", 2);
    a = answerQuestion(bank, a, "mov-02", 2);
    a = answerQuestion(bank, a, "mov-03", ["time"]);
    a = answerQuestion(bank, a, "mov-04", 2);
    a = answerQuestion(bank, a, "mov-05", 2);
    const rec = recommend(bank, a, scoreAssessment(bank, a)).find((r) => r.principleId === "movement")!;
    expect(rec.ruleId).toBe("R2-version-minima");
    expect(rec.action).toBe(HABITS.find((h) => h.id === "movement")!.smallerAction);
  });

  it("R3: si ya está en la versión mínima, la explicación lo declara", () => {
    let a = createAssessment(bank, "t");
    a = answerQuestion(bank, a, "mov-01", 0);
    a = answerQuestion(bank, a, "mov-02", 0);
    a = answerQuestion(bank, a, "mov-03", ["time"]);
    a = answerQuestion(bank, a, "mov-04", 0);
    a = answerQuestion(bank, a, "mov-05", 0);
    const smallest = HABITS.find((h) => h.id === "movement")!.smallerAction;
    const rec = recommend(bank, a, scoreAssessment(bank, a), {
      adaptedActions: { movement: smallest },
    }).find((r) => r.principleId === "movement")!;
    expect(rec.ruleId).toBe("R3-ya-minima");
    expect(rec.explanation.toLowerCase()).toMatch(/versión más pequeña/);
  });

  it("R4: sin niveles no hay sugerencias (flujo manual)", () => {
    const { assessment, profile } = profileWith({
      movement: "skip", nourishment: "skip", rest: "skip",
      family: "skip", community: "skip", nature: "skip", purpose: "skip",
    });
    expect(recommend(bank, assessment, profile)).toEqual([]);
  });

  it("cada recomendación cita regla en su explicación (SC-001)", () => {
    const { assessment, profile } = profileWith({ rest: 1 });
    for (const rec of recommend(bank, assessment, profile)) {
      expect(rec.explanation.length).toBeGreaterThan(20);
      expect(rec.explanation).toContain(rec.ruleId);
    }
  });

  it("es determinista (SC-002)", () => {
    const { assessment, profile } = profileWith({ rest: 1, family: 0 });
    expect(recommend(bank, assessment, profile)).toEqual(recommend(bank, assessment, profile));
  });

  it("el catálogo de reglas está documentado con id y descripción", () => {
    expect(BUILT_IN_RULES.length).toBeGreaterThanOrEqual(4);
    for (const rule of BUILT_IN_RULES) {
      expect(rule.id).toMatch(/^R\d-/);
      expect(rule.description.length).toBeGreaterThan(10);
    }
  });

  it("suggestGoals mantiene compatibilidad y expone ruleId (SC-003)", () => {
    const { assessment, profile } = profileWith({ movement: 1 });
    const suggestions = suggestGoals(bank, assessment, profile);
    for (const s of suggestions) {
      expect(s.ruleId).toMatch(/^R\d-/);
    }
  });
});
