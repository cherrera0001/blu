import { transition, type EvidenceSource } from "./registry";

// Flujo de revisión humana (BLU-1302): ninguna recomendación publica una cita
// sin evidencia aprobada por una revisor nominada, y el retiro de una fuente
// marca en revisión sus recomendaciones ligadas (cascada explícita, specs/008).

/** Recomendación publicable de hábito con su evidencia ligada. */
export interface Recommendation {
  id: string;
  claim: string;
  sourceId: string | null;
}

export type PublicationState =
  | { state: "publicable"; citation: string }
  | { state: "sin-evidencia-verificada" }
  | { state: "en-revision" };

/**
 * Cita visible de una fuente: solo aprobada produce texto (deny-by-default).
 * Incluye la fecha y la revisor de la revisión humana (Gherkin BLU-1302).
 */
export function citationFor(source: EvidenceSource): string | null {
  if (source.status !== "aprobada" || !source.reviewedAt || !source.reviewer) return null;
  const date = source.reviewedAt.slice(0, 10);
  return (
    `${source.claim} — Fuente: ${source.referenceValue} (${source.referenceType}), ` +
    `revisada el ${date} por ${source.reviewer}.`
  );
}

/**
 * Resolución deny-by-default del estado de publicación de una recomendación:
 * fuente aprobada → publicable con cita; pendiente o inexistente → sin
 * evidencia verificada; retirada → en revisión (ocultar con aviso).
 */
export function resolvePublication(
  recommendation: Recommendation,
  sourcesById: ReadonlyMap<string, EvidenceSource>,
): PublicationState {
  if (!recommendation.sourceId) return { state: "sin-evidencia-verificada" };
  const source = sourcesById.get(recommendation.sourceId);
  if (!source) return { state: "sin-evidencia-verificada" };
  if (source.status === "retirada") return { state: "en-revision" };
  const citation = citationFor(source);
  if (!citation) return { state: "sin-evidencia-verificada" };
  return { state: "publicable", citation };
}

export interface CascadeResult {
  source: EvidenceSource;
  affected: Array<{ recommendationId: string; from: "publicable"; to: "en-revision" }>;
}

export type WithdrawResult =
  | ({ ok: true } & CascadeResult)
  | { ok: false; error: string };

/**
 * Retiro de una fuente con cascada: aplica el ciclo de vida (solo
 * aprobada → retirada) y devuelve las recomendaciones ligadas que quedan
 * en revisión. Ninguna recomendación se oculta silenciosamente: el llamador
 * debe comunicar el aviso (estado "en-revision").
 */
export function withdrawWithCascade(
  sources: ReadonlyArray<EvidenceSource>,
  recommendations: ReadonlyArray<Recommendation>,
  sourceId: string,
  ctx: { reviewer: string; at?: string },
): WithdrawResult {
  const source = sources.find((s) => s.id === sourceId);
  if (!source) return { ok: false, error: `Fuente no encontrada: ${sourceId}.` };
  if (source.status !== "aprobada") {
    return {
      ok: false,
      error: `Ciclo de vida: solo una fuente aprobada puede retirarse (estado actual «${source.status}»).`,
    };
  }
  const moved = transition(source, "retirada", ctx);
  if (!moved.ok) return { ok: false, error: moved.error };
  const affected = recommendations
    .filter((r) => r.sourceId === sourceId)
    .map((r) => ({ recommendationId: r.id, from: "publicable" as const, to: "en-revision" as const }));
  return { ok: true, source: moved.source, affected };
}
