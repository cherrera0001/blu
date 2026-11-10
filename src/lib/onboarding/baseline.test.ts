import { describe, expect, it } from "vitest";
import { loadBank } from "./bank-loader";
import { createAssessment, answerQuestion } from "./engine";
import { scoreAssessment, type Profile } from "./scoring";
import { computeBaseline, BASELINE_MIN_PRINCIPLES } from "./baseline";

function profileWithScores(scores: Array<number | null>): Profile {
  return {
    bankVersion: "1.0.0",
    computedAt: "2026-11-04T00:00:00.000Z",
    experimental: true,
    results: scores.map((score, i) => ({
      principleId: `p${i}`,
      answered: score === null ? 0 : 4,
      totalScoreable: 4,
      skipped: score === null ? 4 : 0,
      score,
      band: score === null ? null : "developing",
      confidence: "normal" as const,
    })),
  };
}

describe("computeBaseline — línea base experimental (no clínica)", () => {
  it("promedio entero de las dimensiones con respuestas; omitidas solo reducen cobertura", () => {
    const baseline = computeBaseline(profileWithScores([50, null, 70, 60]));
    expect(baseline.value).toBe(60); // (50+70+60)/3
    expect(baseline.coverage).toBe(3);
    expect(Number.isInteger(baseline.value!)).toBe(true); // sin decimales fabricados
  });

  it("no fabrica total con menos de 3 dimensiones respondidas", () => {
    const baseline = computeBaseline(profileWithScores([50, 70, null, null]));
    expect(baseline.value).toBeNull();
    expect(baseline.sufficient).toBe(false);
  });

  it("umbral exacto (3 dimensiones): valor con cobertura baja declarada", () => {
    const baseline = computeBaseline(profileWithScores([50, 70, 60, null]));
    expect(baseline.value).toBe(60);
    expect(baseline.coverage).toBe(BASELINE_MIN_PRINCIPLES);
  });

  it("sin ninguna respuesta: sin línea base y sin error", () => {
    const baseline = computeBaseline(profileWithScores([null, null, null, null]));
    expect(baseline.value).toBeNull();
    expect(baseline.sufficient).toBe(false);
  });

  it("es determinista: mismo perfil → misma línea base", () => {
    const profile = profileWithScores([40, 55, null, 80, 65, null, 70]);
    expect(computeBaseline(profile)).toEqual(computeBaseline(profile));
  });

  it("la fórmula expuesta menciona promedio, dimensiones respondidas y omisiones", () => {
    const { formula } = computeBaseline(profileWithScores([50, 70, 60]));
    expect(formula).toMatch(/promedio/i);
    expect(formula).toMatch(/dimensiones respondidas/i);
    expect(formula).toMatch(/omitidas/i);
  });

  it("el disclaimer declara medida descriptiva y experimental, no diagnóstico", () => {
    const { disclaimer } = computeBaseline(profileWithScores([50, 70, 60]));
    expect(disclaimer).toMatch(/descriptiva y experimental/i);
    expect(disclaimer).toMatch(/no es un diagnóstico/i);
    expect(disclaimer).not.toMatch(/riesgo|tratamiento/i);
  });
});

describe("computeBaseline — total de preguntas derivado del banco (regresión)", () => {
  it("respondiendo todo el banco real: answeredQuestions ≤ totalQuestions y sin total hardcodeado", () => {
    const bank = loadBank();
    let assessment = createAssessment(bank, "2026-11-05T00:00:00.000Z");
    for (const principle of bank.principles) {
      for (const question of principle.questions) {
        if (!question.countsTowardScore) continue;
        try {
          assessment = answerQuestion(
            bank,
            assessment,
            question.id,
            question.type === "likert5" ? 2 : 1,
          );
        } catch {
          // pregunta omitible no respondible en este contexto: se ignora
        }
      }
    }
    const baseline = computeBaseline(scoreAssessment(bank, assessment));
    expect(baseline.answeredQuestions).toBeLessThanOrEqual(baseline.totalQuestions);
    expect(baseline.totalQuestions).toBe(29); // banco v1.0.0: 29 puntuables (rest tiene 5)
    expect(baseline.answeredQuestions).toBe(29);
  });

  it("totalQuestions es la suma de totalScoreable reportado por scoring", () => {
    const bank = loadBank();
    const profile = scoreAssessment(bank, createAssessment(bank, "t"));
    const baseline = computeBaseline(profile);
    const sum = profile.results.reduce((n, r) => n + r.totalScoreable, 0);
    expect(baseline.totalQuestions).toBe(sum);
  });
});
