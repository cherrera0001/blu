import type { HabitId } from "blu-core/blu";
import { loadEducation } from "blu-core/habit-education";

/**
 * «¿Por qué este paso?» (paridad web BLU-1304). En el teléfono no existe el
 * registro de evidencia, así que la trazabilidad es deny-by-default: nunca se
 * muestra una fuente como verificada.
 */
export interface WhyNote {
  id: string;
  title: string;
  text: string;
  sourceLine: string;
}

const education = loadEducation();

export const WHY_DISCLAIMER = education.disclaimer;

export function whyNotes(habitId: HabitId): WhyNote[] {
  const principle = education.principles.find((p) => p.principleId === habitId);
  return (principle?.notes ?? []).map((note) => ({
    id: note.id,
    title: note.title,
    text: note.text,
    sourceLine: `Fuente: ${note.sourceLabel} (sin evidencia verificada)`,
  }));
}
