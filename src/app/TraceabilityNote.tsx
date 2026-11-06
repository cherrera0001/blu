"use client";

import { loadRegistry } from "@/lib/evidence/registry";
import { resolveNoteTrace } from "@/lib/evidence/traceability";
import type { EducationNote } from "@/lib/habit-education";

/**
 * Línea de trazabilidad de una nota educativa (BLU-1304): «Fuente: X» con el
 * rótulo honesto — «verificada» solo cuando el registro lo respalda, con la
 * fecha y la revisor de la revisión; en cualquier otro caso
 * «sin evidencia verificada» (deny-by-default).
 */
export function TraceabilityNote({ note }: { note: EducationNote }) {
  const registry = loadRegistry();
  const sourcesById = new Map(registry.sources.map((s) => [s.id, s]));
  const trace = resolveNoteTrace(note, sourcesById);
  return (
    <span className="source-trace">
      <em>Fuente: {note.sourceLabel}</em>{" "}
      {trace.kind === "verificada" ? (
        <em className="source-verified">
          (verificada el {trace.reviewedAt} por {trace.reviewer})
        </em>
      ) : (
        <em className="source-pending">(sin evidencia verificada)</em>
      )}
    </span>
  );
}
