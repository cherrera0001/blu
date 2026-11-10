import { describe, expect, it } from "vitest";
import { validateBank, type Question } from "./bank";
import { answerQuestion, createAssessment, skipQuestion } from "./engine";
import { scoreAssessment } from "./scoring";
import bankJson from "@/data/onboarding/bank.json";

const bank = validateBank(bankJson);

function answerAll(
  scorer: (q: Question) => number | "skip",
): ReturnType<typeof createAssessment> {
  let a = createAssessment(bank, "2026-11-04T00:00:00.000Z");
    for (const p of bank.principles) {
    for (const q of p.questions) {
      if (a.answers[q.id]) continue;
      const v = q.type === "multi_choice" ? "skip" : scorer(q);
      try {
        a =
          v === "skip"
            ? skipQuestion(bank, a, q.id)
            : answerQuestion(bank, a, q.id, v);
      } catch (e) {
        if (!/omitida|omisible/.test(String(e))) throw e;
      }
    }
  }
  return a;
}

describe("scoreAssessment", () => {
  it("máximos válidos → score 100 y fortaleza en cada principio", () => {
    const a = answerAll((q) => (q.type === "likert5" ? 4 : Math.max(...q.options!.map((o) => Number(o.value)))));
    const profile = scoreAssessment(bank, a);
    for (const r of profile.results) {
      expect(r.score).toBe(100);
      expect(r.band).toBe("strength");
      expect(r.confidence).toBe("normal");
    }
  });

  it("mínimos válidos → score 0 y espacio para cuidarte", () => {
    const a = answerAll((q) => (q.type === "likert5" ? 0 : Math.min(...q.options!.map((o) => Number(o.value)))));
    const profile = scoreAssessment(bank, a);
    for (const r of profile.results) {
      expect(r.score).toBe(0);
      expect(r.band).toBe("care");
    }
  });

  it("valores intermedios → banda developing", () => {
    let a = createAssessment(bank, "t");
    for (const q of bank.principles[0].questions) {
      if (q.type === "multi_choice") continue;
      try {
        a = answerQuestion(bank, a, q.id, 2);
      } catch (e) {
        if (!/omitida/.test(String(e))) throw e;
      }
    }
    const r = scoreAssessment(bank, a).results[0];
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.score).toBeLessThan(70);
    expect(r.band).toBe("developing");
  });

  it("principio sin respuestas puntuables no emite nivel", () => {
    let a = createAssessment(bank, "t");
    for (const q of bank.principles[0].questions) {
      if (q.skippable) {
        try {
          a = skipQuestion(bank, a, q.id);
        } catch {
          /* no omisible */
        }
      }
    }
    const r = scoreAssessment(bank, a).results[0];
    expect(r.score).toBeNull();
    expect(r.band).toBeNull();
  });

  it("más de 30% de omisiones reduce la confianza; 20% no", () => {
    let a = createAssessment(bank, "t");
    a = answerQuestion(bank, a, "des-01", 2);
    a = skipQuestion(bank, a, "des-02");
    a = skipQuestion(bank, a, "des-03");
    let r = scoreAssessment(bank, a).results.find((x) => x.principleId === "rest")!;
    expect(r.confidence).toBe("reduced");

    let b = createAssessment(bank, "t");
    b = answerQuestion(bank, b, "des-01", 2);
    b = skipQuestion(bank, b, "des-02");
    r = scoreAssessment(bank, b).results.find((x) => x.principleId === "rest")!;
    expect(r.confidence).toBe("normal");
  });

  it("multi_choice no afecta el índice del principio", () => {
    let a = createAssessment(bank, "t");
    for (const q of bank.principles[0].questions) {
      if (q.type === "multi_choice") continue;
      try {
        a = answerQuestion(bank, a, q.id, 3);
      } catch (e) {
        if (!/omitida/.test(String(e))) throw e;
      }
    }
    const base = scoreAssessment(bank, a).results[0];
    const withMulti = answerQuestion(bank, a, "mov-03", ["time", "energy"]);
    expect(scoreAssessment(bank, withMulti).results[0].score).toBe(base.score);
  });

  it("omisiones y preguntas sin responder no reducen la puntuación (penalización cero)", () => {
    // Referencia: solo mov-01 = 2 (máx 3 → 2/3).
    const base = answerQuestion(bank, createAssessment(bank, "t"), "mov-01", 2);
    const baseScore = scoreAssessment(bank, base).results[0].score;
    expect(baseScore).toBe(Math.round((2 / 3) * 100));

    // Caso A: las demás omitidas explícitamente → mismo score, confianza reducida.
    let omitted = answerQuestion(bank, createAssessment(bank, "t"), "mov-01", 2);
    omitted = skipQuestion(bank, omitted, "mov-02");
    omitted = skipQuestion(bank, omitted, "mov-04");
    omitted = skipQuestion(bank, omitted, "mov-05");
    const resultA = scoreAssessment(bank, omitted).results[0];
    expect(resultA.score).toBe(baseScore);
    expect(resultA.confidence).toBe("reduced");

    // Caso B: las demás nunca contestadas (assessment aún incompleto) → mismo score;
    // la confianza reducida solo refleja omisiones explícitas, no preguntas pendientes.
    const untouched = answerQuestion(bank, createAssessment(bank, "t"), "mov-01", 2);
    const resultB = scoreAssessment(bank, untouched).results[0];
    expect(resultB.score).toBe(baseScore);
    expect(resultB.confidence).toBe("normal");
  });

  it("el perfil conserva la versión del banco y marca experimental", () => {
    const profile = scoreAssessment(bank, answerAll(() => 2));
    expect(profile.bankVersion).toBe("1.0.0");
    expect(profile.experimental).toBe(true);
    expect(profile.results).toHaveLength(7);
  });
});
