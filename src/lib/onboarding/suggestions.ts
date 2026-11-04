import { HABITS, type HabitId } from "@/lib/blu";
import type { QuestionBank } from "./bank";
import type { Assessment } from "./engine";
import { BAND_LABELS, type Band, type Profile } from "./scoring";

export interface Suggestion {
  id: string;
  principleId: string;
  habitId: HabitId;
  title: string;
  action: string;
  explanation: string;
  band: Band;
}

const DEFAULT_MAX_SUGGESTIONS = 3;

/**
 * Reglas publicadas (FR-001..FR-004):
 * 1. Solo principios con nivel (score/band no nulos).
 * 2. Orden ascendente por score; empates por orden del banco (determinista).
 * 3. Máximo 3 (configurable).
 * 4. Si hay barreras declaradas de tiempo/energía, la acción es la versión mínima.
 */
export function suggestGoals(
  bank: QuestionBank,
  assessment: Assessment,
  profile: Profile,
  max: number = DEFAULT_MAX_SUGGESTIONS,
): Suggestion[] {
  const byBankOrder = new Map(profile.results.map((r, index) => [r.principleId, index]));
  const eligible = profile.results
    .filter((r) => r.band !== null && r.score !== null)
    .sort((a, b) => a.score! - b.score! || byBankOrder.get(a.principleId)! - byBankOrder.get(b.principleId)!)
    .slice(0, max);

  return eligible.map((result) => {
    const principle = bank.principles.find((p) => p.id === result.principleId);
    const habit = HABITS.find((h) => h.id === result.principleId);
    if (!principle || !habit) {
      throw new Error(`Principio sin catálogo asociado: «${result.principleId}».`);
    }
    const barriers = barrierLabels(bank, assessment, principle.id);
    const lowCapacity = barriers.some((label) => /tiempo|energ/i.test(label));
    const action = lowCapacity ? habit.smallerAction : habit.action;
    const barrierSentence =
      barriers.length > 0 ? `Mencionaste: ${barriers.join(", ").toLowerCase()}. ` : "";
    const explanation =
      `En «${principle.title}» tu autodiagnóstico señaló «${BAND_LABELS[result.band!]}». ` +
      `${barrierSentence}Te sugerimos partir por: «${action}»`;

    return {
      id: `sug-${principle.id}`,
      principleId: principle.id,
      habitId: habit.id,
      title: principle.title,
      action,
      explanation,
      band: result.band!,
    };
  });
}

function barrierLabels(bank: QuestionBank, assessment: Assessment, principleId: string): string[] {
  const principle = bank.principles.find((p) => p.id === principleId);
  if (!principle) return [];
  const labels: string[] = [];
  for (const question of principle.questions) {
    if (question.type !== "multi_choice") continue;
    const answer = assessment.answers[question.id];
    if (!answer || answer.kind !== "value" || !Array.isArray(answer.value)) continue;
    for (const value of answer.value) {
      const option = question.options?.find((o) => o.value === value);
      if (option) labels.push(option.label);
    }
  }
  return labels;
}
