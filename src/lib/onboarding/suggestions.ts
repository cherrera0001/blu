import type { HabitId } from "@/lib/blu";
import type { QuestionBank } from "./bank";
import type { Assessment } from "./engine";
import type { Band, Profile } from "./scoring";
import { recommend, type RecommendOptions } from "./rules";

export interface Suggestion {
  id: string;
  ruleId: string;
  principleId: string;
  habitId: HabitId;
  title: string;
  action: string;
  explanation: string;
  band: Band;
}

/**
 * Reglas publicadas en specs/003 y specs/007 (FR-001..FR-004):
 * el motor vive en ./rules (catálogo versionado, determinista); esta función
 * mantiene la firma histórica para la UI y añade `ruleId`.
 */
export function suggestGoals(
  bank: QuestionBank,
  assessment: Assessment,
  profile: Profile,
  max: number = 3,
  options: Omit<RecommendOptions, "max"> = {},
): Suggestion[] {
  return recommend(bank, assessment, profile, { ...options, max });
}
