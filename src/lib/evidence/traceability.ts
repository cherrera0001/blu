import type { EducationNote } from "@/lib/habit-education";
import type { EvidenceSource } from "./registry";
import { citationFor } from "./review";

// Trazabilidad visible (BLU-1304): el rótulo «verificada» solo se muestra si el
// registro de evidencia lo respalda; la fecha de revisión solo aparece con una
// fuente aprobada real. Deny-by-default en todos los demás casos.

export type NoteLike = Pick<EducationNote, "id" | "title" | "text" | "sourceLabel" | "sourceStatus"> & {
  /** Ligadura opcional al registro de evidencia (ev-AAAA-NNN). */
  evidenceId?: string;
};

export type NoteTrace =
  | { kind: "verificada"; citation: string; reviewedAt: string; reviewer: string; referenceValue: string }
  | { kind: "sin-evidencia-verificada"; reviewedAt: null };

/**
 * Resuelve la trazabilidad honesta de una nota educativa. Una nota marcada
 * «verificada» sin respaldo en el registro se downgrada: nunca mostramos una
 * verificación que no existe.
 */
export function resolveNoteTrace(
  note: NoteLike,
  sourcesById: ReadonlyMap<string, EvidenceSource>,
): NoteTrace {
  const source = note.evidenceId ? sourcesById.get(note.evidenceId) : undefined;
  if (source) {
    const citation = citationFor(source);
    if (citation && source.reviewedAt) {
      return {
        kind: "verificada",
        citation,
        reviewedAt: source.reviewedAt.slice(0, 10),
        reviewer: source.reviewer ?? "",
        referenceValue: source.referenceValue,
      };
    }
  }
  return { kind: "sin-evidencia-verificada", reviewedAt: null };
}
