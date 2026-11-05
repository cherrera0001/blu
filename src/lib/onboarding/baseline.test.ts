import { describe, expect, it } from "vitest";
import type { Profile } from "./scoring";
import { computeBaseline, BASELINE_MIN_PRINCIPLES } from "./baseline";

function profileWithScores(scores: Array<number | null>): Profile {
  return {
    bankVersion: "1.0.0",
    computedAt: "2026-11-04T00:00:00.000Z",
    experimental: true,
    results: scores.map((score, i) => ({
      principleId: `p${i}`,
      answered: score === null ? 0 : 4,
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
