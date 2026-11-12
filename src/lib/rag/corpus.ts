import type { EvidenceSource } from "@/lib/evidence/registry";
import { citationFor } from "@/lib/evidence/review";

/**
 * Corpus RAG (#58, ADR-0008 D-2): SOLO fuentes con cita publicable
 * (estado «aprobada» + revisión nominada). Indexar otra cosa es un defecto de
 * seguridad, no de producto: por eso el filtro vive aquí y en la RPC SQL.
 */
export interface CorpusDoc {
  id: string;
  /** Texto que se indexa: afirmación + resultados + población. */
  text: string;
  claim: string;
  citation: string;
}

export function buildCorpus(sources: readonly EvidenceSource[]): CorpusDoc[] {
  const out: CorpusDoc[] = [];
  for (const source of sources) {
    const citation = citationFor(source);
    if (!citation) continue;
    out.push({
      id: source.id,
      text: [source.claim, source.outcomes, source.population].join(". "),
      claim: source.claim,
      citation,
    });
  }
  return out;
}
