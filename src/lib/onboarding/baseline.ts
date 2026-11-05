import type { Profile } from "./scoring";

export const BASELINE_MIN_PRINCIPLES = 3;

export interface Baseline {
  /** 0–100, entero. null cuando no hay base suficiente (menos de 3 dimensiones con respuestas). */
  value: number | null;
  sufficient: boolean;
  /** Dimensiones (de 7) con al menos una respuesta puntuable. */
  coverage: number;
  principlesUsed: number;
  totalPrinciples: number;
  /** Preguntas puntuables respondidas / totales (transparencia del cálculo). */
  answeredQuestions: number;
  totalQuestions: number;
  /** Descripción pública de la fórmula, en lenguaje simple. */
  formula: string;
  /** Rotulo obligatorio: medida descriptiva y experimental, no clínica. */
  disclaimer: string;
}

const DISCLAIMER =
  "Medida descriptiva y experimental para tu reflexión personal: no es un diagnóstico, " +
  "no compara con otras personas y no predice resultados de salud.";

/**
 * Línea base: promedio entero de los índices por dimensión que tienen respuestas.
 * Las omitidas no penalizan: solo reducen la cobertura. Sin respuestas suficientes
 * (BASELINE_MIN_PRINCIPLES dimensiones) no se fabrica un total.
 */
export function computeBaseline(profile: Profile): Baseline {
  const withScore = profile.results.filter((r) => r.score !== null);
  const coverage = withScore.length;
  const sufficient = coverage >= BASELINE_MIN_PRINCIPLES;
  const value =
    coverage === 0 ? null : Math.round(withScore.reduce((n, r) => n + r.score!, 0) / coverage);

  const answeredQuestions = profile.results.reduce((n, r) => n + r.answered, 0);
  const totalQuestions = 28; // preguntas puntuables del banco v1.0.0 (7 dimensiones x 4)

  return {
    value: sufficient ? value : null,
    sufficient,
    coverage,
    principlesUsed: coverage,
    totalPrinciples: profile.results.length,
    answeredQuestions,
    totalQuestions,
    formula:
      "Promedio de las dimensiones respondidas (cada una va de 0 a 100 según tus respuestas). " +
      "Las preguntas omitidas no bajan el puntaje: solo reducen la cobertura.",
    disclaimer: DISCLAIMER,
  };
}
