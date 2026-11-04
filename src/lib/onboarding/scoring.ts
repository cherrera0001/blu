import type { QuestionBank } from "./bank";
import type { Assessment } from "./engine";

export type Band = "care" | "developing" | "strength";

export interface PrincipleResult {
  principleId: string;
  answered: number;
  skipped: number;
  score: number | null;
  band: Band | null;
  confidence: "normal" | "reduced";
}

export interface Profile {
  bankVersion: string;
  computedAt: string;
  experimental: true;
  results: PrincipleResult[];
}

const OMISSION_THRESHOLD = 0.3;

function maxFor(questionType: string, optionsMax: number): number {
  return questionType === "likert5" ? 4 : optionsMax;
}

export function scoreAssessment(bank: QuestionBank, assessment: Assessment): Profile {
  const results: PrincipleResult[] = bank.principles.map((principle) => {
    const puntuables = principle.questions.filter((q) => q.countsTowardScore);
    let sum = 0;
    let answered = 0;
    let skipped = 0;

    for (const question of puntuables) {
      const answer = assessment.answers[question.id];
      if (!answer) continue; // sin responder o omitida por regla: no cuenta ni a favor ni en contra
      if (answer.kind === "skipped") {
        skipped += 1;
        continue;
      }
      if (Array.isArray(answer.value)) continue;
      const optionsMax =
        question.type === "single_choice"
          ? Math.max(...(question.options ?? []).map((o) => Number(o.value)))
          : 4;
      sum += Number(answer.value) / maxFor(question.type, optionsMax);
      answered += 1;
    }

    if (answered === 0) {
      return {
        principleId: principle.id,
        answered: 0,
        skipped,
        score: null,
        band: null,
        confidence: puntuables.length > 0 && skipped / puntuables.length > OMISSION_THRESHOLD ? "reduced" : "normal",
      };
    }

    const score = Math.round((sum / puntuables.length) * 100);
    const omissionRatio = skipped / puntuables.length;
    return {
      principleId: principle.id,
      answered,
      skipped,
      score,
      band: score < 40 ? "care" : score < 70 ? "developing" : "strength",
      confidence: omissionRatio > OMISSION_THRESHOLD ? "reduced" : "normal",
    };
  });

  return {
    bankVersion: bank.bankVersion,
    computedAt: new Date().toISOString(),
    experimental: true,
    results,
  };
}

export const BAND_LABELS: Record<Band, string> = {
  care: "Espacio para cuidarte",
  developing: "En desarrollo",
  strength: "Fortaleza",
};
