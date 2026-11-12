import type { CorpusDoc } from "./corpus";
import { normalize, type Retriever } from "./lexical";

/**
 * Fundamentación fail-closed (#58). Por defecto: incertidumbre. Solo se
 * fundamenta con evidencia aprobada sobre umbral y sin señales de que la
 * consulta empuja una afirmación clínica o absoluta.
 */
export const DEFAULT_THRESHOLD = 0.5;

export type Grounding =
  | { kind: "grounded"; sources: Array<Pick<CorpusDoc, "id" | "claim" | "citation"> & { score: number }> }
  | { kind: "uncertain"; reason: "sin_corpus" | "bajo_umbral" | "afirmacion_clinica" | "error" };

/**
 * Señales de consulta que buscan una afirmación sin fuente o clínica
 * (PRD §5: Blu no diagnostica, no trata, no promete). Ante ellas, ni se busca.
 */
const CLAIM_CUES = [
  "cura", "curar", "sana", "sanar", "diagnost", "tratamiento", "tratar ", "medicament",
  "remedio", "pastilla", "dosis", "enfermedad", "diabetes", "cancer", "depresion",
  "ansiedad cronica", "presion arterial", "colesterol", "garantiza", "garantia",
  "100%", "siempre funciona", "nunca falla", "todos saben", "todo el mundo sabe",
  "esta comprobado", "demostrado que", "vivir mas", "longevidad", "adelgazar", "bajar de peso",
];

export function hasClaimCue(query: string): boolean {
  const q = ` ${normalize(query)} `;
  return CLAIM_CUES.some((cue) => q.includes(cue));
}

export async function ground(
  query: string,
  corpus: readonly CorpusDoc[],
  retriever: Retriever,
  threshold = DEFAULT_THRESHOLD,
): Promise<Grounding> {
  if (corpus.length === 0) return { kind: "uncertain", reason: "sin_corpus" };
  if (hasClaimCue(query)) return { kind: "uncertain", reason: "afirmacion_clinica" };
  let hits;
  try {
    hits = await retriever.search(query, 3);
  } catch {
    return { kind: "uncertain", reason: "error" };
  }
  const byId = new Map(corpus.map((d) => [d.id, d]));
  const sources = hits
    .filter((h) => h.score >= threshold && byId.has(h.id))
    .slice(0, 2)
    .map((h) => {
      const doc = byId.get(h.id)!;
      return { id: doc.id, claim: doc.claim, citation: doc.citation, score: h.score };
    });
  return sources.length > 0 ? { kind: "grounded", sources } : { kind: "uncertain", reason: "bajo_umbral" };
}

/** Bloque para el prompt remoto: datos, no instrucciones de la persona. */
export function describeGrounding(g: Grounding): string {
  if (g.kind === "uncertain") {
    return "Evidencia aprobada para esta consulta: ninguna. No afirmes beneficios ni datos; si la persona pregunta por efectos, di con honestidad que Blu no tiene evidencia revisada sobre eso.";
  }
  const lines = g.sources.map((s) => `- [${s.id}] ${s.citation}`);
  return `Evidencia aprobada (revisada por una persona) que puedes citar, sin ampliarla ni exagerarla:\n${lines.join("\n")}\nSi la usas, menciona su identificador entre corchetes.`;
}
