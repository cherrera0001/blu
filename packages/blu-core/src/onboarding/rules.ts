import { HABITS, type HabitId } from "../blu";
import type { QuestionBank } from "./bank";
import type { Assessment } from "./engine";
import { BAND_LABELS, type Band, type Profile } from "./scoring";

export interface Rule {
  id: string;
  description: string;
}

/**
 * Catálogo de reglas del motor (constitución VIII: cambian solo por PR versionado).
 * R1 selecciona; R2/R3 gobiernan la acción; R4 define el comportamiento sin niveles.
 */
export const BUILT_IN_RULES: Rule[] = [
  {
    id: "R1-banda-baja",
    description:
      "Selecciona principios con nivel calculado, del más bajo al más alto (empate por orden del banco); máximo 3; la acción base es la del hábito.",
  },
  {
    id: "R2-version-minima",
    description:
      "Con barrera declarada de tiempo o energía, propone la versión mínima del hábito y lo dice.",
  },
  {
    id: "R3-ya-minima",
    description:
      "Si el hábito ya está en su versión mínima (registrado en el plan), lo declara en lugar de proponer de nuevo lo mismo.",
  },
  {
    id: "R4-sin-nivel",
    description:
      "Sin niveles calculados no hay sugerencias: la persona elige manualmente.",
  },
];

export interface Recommendation {
  id: string;
  ruleId: string;
  principleId: string;
  habitId: HabitId;
  title: string;
  action: string;
  explanation: string;
  band: Band;
}

export interface RecommendOptions {
  max?: number;
  /** Acciones ya adaptadas por hábito (desde el plan local), para que R3 lo declare. */
  adaptedActions?: Record<string, string>;
}

export function recommend(
  bank: QuestionBank,
  assessment: Assessment,
  profile: Profile,
  options: RecommendOptions = {},
): Recommendation[] {
  const max = options.max ?? 3;
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
    const smallest = habit.smallerAction;

    let ruleId: string;
    let action: string;
    let note: string;
    if (lowCapacity && options.adaptedActions?.[habit.id] === smallest) {
      ruleId = "R3-ya-minima";
      action = smallest;
      note = "Ya está en su versión más pequeña: mantenerla cuenta.";
    } else if (lowCapacity) {
      ruleId = "R2-version-minima";
      action = smallest;
      note = `Mencionaste: ${barriers.join(", ")}. `;
    } else {
      ruleId = "R1-banda-baja";
      action = habit.action;
      note = barriers.length > 0 ? `Mencionaste: ${barriers.join(", ")}. ` : "";
    }

    const explanation =
      `En «${principle.title}» tu autodiagnóstico señaló «${BAND_LABELS[result.band!]}». ` +
      `${note}Te sugerimos partir por: «${action}». ` +
      `(Regla aplicada: ${ruleId})`;

    return {
      id: `sug-${principle.id}`,
      ruleId,
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
